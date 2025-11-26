use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::MenuBuilder, tray::TrayIconBuilder, App, AppHandle, Manager, Runtime, WindowEvent,
};
#[cfg(desktop)]
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
#[allow(unused_imports)]
use tauri_plugin_log::{
    log::{debug, error, info, trace, warn},
    Target, TargetKind,
};

const TRAY_ICON_ID: &str = "main-tray";
const TRAY_MENU_SHOW: &str = "tray-show";
const TRAY_MENU_QUIT: &str = "tray-quit";

#[derive(Default)]
struct AppLifecycle {
    exiting: AtomicBool,
}

impl AppLifecycle {
    fn mark_exiting(&self) {
        self.exiting.store(true, Ordering::SeqCst);
    }

    fn is_exiting(&self) -> bool {
        self.exiting.load(Ordering::SeqCst)
    }
}

fn build_tray<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text(TRAY_MENU_SHOW, "显示主界面")
        .separator()
        .text(TRAY_MENU_QUIT, "退出程序")
        .build()?;

    let mut tray_builder = TrayIconBuilder::with_id(TRAY_ICON_ID)
        .menu(&tray_menu)
        .tooltip("assassin-alarm-clock")
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_MENU_SHOW => {
                info!("用户点击显示主界面");
                show_main_window(app);
            }
            TRAY_MENU_QUIT => {
                info!("用户点击退出程序");
                let lifecycle = app.state::<AppLifecycle>();
                lifecycle.mark_exiting();
                app.exit(0);
            }
            other => {
                info!("用户点击了未知菜单项: {other}");
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    }

    tray_builder.build(app)?;
    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder = builder
        .manage(AppLifecycle::default())
        .setup(|app| {
            build_tray(app)?;

            let is_autostart = std::env::args().any(|arg| arg == "--autostart");
            if is_autostart {
                if let Some(window) = app.get_webview_window("main") {
                    // 自启时直接隐藏主窗体，待托盘唤起
                    window.hide().ok();
                }
            }

            #[cfg(desktop)]
            {
                info!("检查开机自启状态");
                let autolaunch = app.autolaunch();
                match autolaunch.is_enabled() {
                    Ok(true) => {
                        info!("开机自启已启用");
                        #[cfg(debug_assertions)]
                        {
                            info!("调试模式下，禁用开机自启");
                            match autolaunch.disable() {
                                Ok(_) => {
                                    info!("调试模式下，开机自启已禁用");
                                }
                                Err(error) => {
                                    error!("无法禁用开机自启: {error}");
                                }
                            }
                        }
                    }
                    Ok(false) => {
                        info!("开机自启未启用");
                        #[cfg(not(debug_assertions))]
                        {
                            info!("尝试启用开机自启");
                            match autolaunch.enable() {
                                Ok(_) => {
                                    info!("开机自启已启用");
                                }
                                Err(error) => {
                                    error!("无法启用开机自启: {error}");
                                }
                            }
                        }
                    }
                    Err(error) => {
                        error!("无法检查开机自启状态: {error}");
                    }
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                let lifecycle = window.state::<AppLifecycle>();
                if lifecycle.is_exiting() {
                    return;
                }

                api.prevent_close();
                let _ = window.hide();
            }
        })
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ));
    }

    builder
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
