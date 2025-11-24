use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::MenuBuilder, tray::TrayIconBuilder, App, AppHandle, Manager, Runtime, WindowEvent,
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
            TRAY_MENU_SHOW => show_main_window(app),
            TRAY_MENU_QUIT => {
                let lifecycle = app.state::<AppLifecycle>();
                lifecycle.mark_exiting();
                app.exit(0);
            }
            _ => {}
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
    tauri::Builder::default()
        .manage(AppLifecycle::default())
        .setup(|app| {
            build_tray(app)?;
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
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
