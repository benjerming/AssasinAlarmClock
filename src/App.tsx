import { useEffect, useMemo, useRef, useState } from "react";
import { AppBar, Box, Container, CssBaseline, Fab, Stack, ThemeProvider, Toolbar, Typography } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import AlarmOnIcon from "@mui/icons-material/AlarmOn";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import "./App.css";
import { DEFAULT_ALARM_MODE } from "./constants/alarm";
import { useChinaWorkdays } from "./hooks/useChinaWorkdays";
import { AlarmList } from "./components/AlarmList";
import { CurrentTimeCard } from "./components/CurrentTimeCard";
import { NewAlarmDialog } from "./components/NewAlarmDialog";
import { TitleBar } from "./components/TitleBar";
import { WorkdaySyncCard } from "./components/WorkdaySyncCard";
import type { Alarm, NewAlarmDraft, NextAlarmInfo } from "./types/alarm";
import {
  formatMinuteKey,
  generateId,
  getNextOccurrence,
  getRoundedTime,
  isTauriEnvironment,
  loadStoredAlarms,
  persistAlarms,
  shouldTriggerAlarm,
} from "./utils/alarm";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#5c6bc0",
    },
    secondary: {
      main: "#ff7043",
    },
    background: {
      default: "#f4f6fb",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Noto Sans SC", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [now, setNow] = useState(() => new Date());
  const [alarms, setAlarms] = useState<Alarm[]>(() => loadStoredAlarms());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAlarm, setNewAlarm] = useState<NewAlarmDraft>(() => ({
    label: "",
    time: getRoundedTime(),
    days: [],
    mode: DEFAULT_ALARM_MODE,
  }));
  const [isTauri, setIsTauri] = useState(false);
  const chinaWorkdays = useChinaWorkdays();
  const [notificationGranted, setNotificationGranted] = useState(false);
  const lastNotificationRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;

    (async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === "granted";
        }
        if (!cancelled) {
          setNotificationGranted(granted);
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("无法获取通知权限", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isTauri]);

  useEffect(() => {
    if (!notificationGranted || !isTauri) return;
    const occurrenceKey = formatMinuteKey(now);

    alarms.forEach((alarm) => {
      if (!shouldTriggerAlarm(alarm, now, chinaWorkdays.isWorkday)) return;
      if (lastNotificationRef.current[alarm.id] === occurrenceKey) return;
      lastNotificationRef.current[alarm.id] = occurrenceKey;

      try {
        Promise.resolve(
          sendNotification({
            title: alarm.label || "闹钟",
            body: `${alarm.time} · ${alarm.label || "闹钟"} 正在响铃`,
          }),
        ).catch((error: unknown) => {
          console.warn("系统通知发送失败", error);
        });
      } catch (error) {
        console.warn("系统通知发送失败", error);
      }
    });
  }, [alarms, now, notificationGranted, chinaWorkdays.isWorkday, isTauri]);

  useEffect(() => {
    persistAlarms(alarms);
  }, [alarms]);

  const nextAlarm = useMemo<NextAlarmInfo | null>(() => {
    return alarms.reduce<NextAlarmInfo | null>((closest, alarm) => {
      const date = getNextOccurrence(alarm, now, { isWorkday: chinaWorkdays.isWorkday });
      if (!date) return closest;
      if (!closest || date < closest.date) {
        return { alarm, date };
      }
      return closest;
    }, null);
  }, [alarms, now, chinaWorkdays.isWorkday]);

  const handleToggle = (id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) => (alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm)),
    );
  };

  const handleDelete = (id: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm.id !== id));
  };

  const handleCreateAlarm = () => {
    if (!newAlarm.time) return;
    setAlarms((prev) => [
      ...prev,
      {
        id: generateId(),
        label: newAlarm.label || "新闹钟",
        time: newAlarm.time,
        days: [...newAlarm.days],
        enabled: true,
        mode: newAlarm.mode,
      },
    ]);
    setDialogOpen(false);
    setNewAlarm({
      label: "",
      time: getRoundedTime(),
      days: [],
      mode: newAlarm.mode,
    });
  };

  const handleNewAlarmChange = (draft: NewAlarmDraft) => {
    setNewAlarm(draft);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar position="sticky" elevation={0} color="primary">
        <Toolbar>
          <AlarmOnIcon color="inherit" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            闹钟
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <CurrentTimeCard now={now} nextAlarm={nextAlarm} />

          <WorkdaySyncCard chinaWorkdays={chinaWorkdays} />

          <AlarmList
            alarms={alarms}
            now={now}
            chinaWorkdays={chinaWorkdays}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </Stack>
      </Container>

      <Fab
        color="primary"
        aria-label="添加闹钟"
        sx={{ position: "fixed", bottom: 32, right: 32 }}
        onClick={() => setDialogOpen(true)}
      >
        <AddAlarmIcon />
      </Fab>

      <NewAlarmDialog
        open={dialogOpen}
        newAlarm={newAlarm}
        chinaWorkdays={chinaWorkdays}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreateAlarm}
        onChange={handleNewAlarmChange}
      />
    </ThemeProvider>
  );
}

export default App;
