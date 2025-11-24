import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fab,
  IconButton,
  Stack,
  Switch,
  TextField,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  Chip,
} from "@mui/material";
import { createTheme } from "@mui/material/styles";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import AlarmOnIcon from "@mui/icons-material/AlarmOn";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import "./App.css";

type DayValue = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

type Alarm = {
  id: string;
  label: string;
  time: string; // HH:mm
  days: DayValue[];
  enabled: boolean;
};

type NextAlarmInfo = {
  alarm: Alarm;
  date: Date;
};

const DAY_ORDER: DayValue[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const DAY_OPTIONS: { value: DayValue; label: string; short: string }[] = [
  { value: "mon", label: "周一", short: "一" },
  { value: "tue", label: "周二", short: "二" },
  { value: "wed", label: "周三", short: "三" },
  { value: "thu", label: "周四", short: "四" },
  { value: "fri", label: "周五", short: "五" },
  { value: "sat", label: "周六", short: "六" },
  { value: "sun", label: "周日", short: "日" },
];

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

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialAlarms: Alarm[] = [];
const STORAGE_KEY = "assassin-alarm-clock:alarms";

const parseStoredAlarms = (value: unknown): Alarm[] => {
  if (!Array.isArray(value)) return initialAlarms;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const { id, label, time, days, enabled } = item as Partial<Alarm>;
      if (typeof time !== "string") return null;
      return {
        id: typeof id === "string" ? id : generateId(),
        label: typeof label === "string" ? label : "新闹钟",
        time,
        days: Array.isArray(days)
          ? days.filter((day): day is DayValue => DAY_ORDER.includes(day as DayValue))
          : [],
        enabled: typeof enabled === "boolean" ? enabled : true,
      };
    })
    .filter(Boolean) as Alarm[];
};

const loadStoredAlarms = (): Alarm[] => {
  if (typeof window === "undefined" || !("localStorage" in window)) return initialAlarms;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return initialAlarms;
    return parseStoredAlarms(JSON.parse(stored));
  } catch (error) {
    console.warn("读取闹钟持久化数据失败", error);
    return initialAlarms;
  }
};

const getRoundedTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5 - (now.getMinutes() % 5 || 5), 0, 0);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatRelative = (target: Date, from: Date) => {
  const diffMs = target.getTime() - from.getTime();
  if (diffMs <= 0) return "即将响铃";
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hoursPart = hours > 0 ? `${hours} 小时` : "";
  const minutesPart = minutes > 0 ? `${minutes} 分钟` : "";
  if (!hoursPart && !minutesPart) return "即将响铃";
  return `距离响铃还有 ${hoursPart}${hoursPart && minutesPart ? " " : ""}${minutesPart}`.trim();
};

const getNextOccurrence = (alarm: Alarm, now: Date): Date | null => {
  if (!alarm.enabled) return null;
  const [hour, minute] = alarm.time.split(":").map(Number);
  const activeDays = alarm.days.length ? alarm.days : DAY_ORDER;

  for (let i = 0; i < 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hour, minute, 0, 0);
    const dayValue = DAY_ORDER[candidate.getDay()];
    if (activeDays.includes(dayValue) && candidate > now) {
      return candidate;
    }
  }
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 7);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
};

function App() {
  const [now, setNow] = useState(() => new Date());
  const [alarms, setAlarms] = useState<Alarm[]>(() => loadStoredAlarms());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAlarm, setNewAlarm] = useState({
    label: "",
    time: getRoundedTime(),
    days: [] as DayValue[],
  });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.warn("写入闹钟持久化数据失败", error);
    }
  }, [alarms]);

  const nextAlarm = useMemo<NextAlarmInfo | null>(() => {
    return alarms.reduce<NextAlarmInfo | null>((closest, alarm) => {
      const date = getNextOccurrence(alarm, now);
      if (!date) return closest;
      if (!closest || date < closest.date) {
        return { alarm, date };
      }
      return closest;
    }, null);
  }, [alarms, now]);

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
      },
    ]);
    setDialogOpen(false);
    setNewAlarm({
      label: "",
      time: getRoundedTime(),
      days: [],
    });
  };

  const handleDayChange = (_: React.MouseEvent<HTMLElement>, values: DayValue[]) => {
    setNewAlarm((prev) => ({ ...prev, days: values }));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" elevation={0} color="transparent">
        <Toolbar>
          <AlarmOnIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            闹钟
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="stretch" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    当前时间
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 600 }}>
                    {now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </Typography>
                  <Typography color="text.secondary">
                    {now.toLocaleDateString("zh-CN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Typography>
                </Box>
                <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", sm: "block" } }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    下一次响铃
                  </Typography>
                  {nextAlarm ? (
                    <>
                      <Typography variant="h4" sx={{ fontWeight: 500 }}>
                        {nextAlarm.alarm.time} · {nextAlarm.alarm.label}
                      </Typography>
                      <Typography color="text.secondary">
                        {nextAlarm.date.toLocaleString("zh-CN", {
                          month: "long",
                          day: "numeric",
                          weekday: "long",
                        })}
                      </Typography>
                      <Typography color="secondary" sx={{ mt: 1 }}>
                        {formatRelative(nextAlarm.date, now)}
                      </Typography>
                    </>
                  ) : (
                    <Typography color="text.secondary">暂无启用的闹钟</Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {alarms.map((alarm) => {
              const next = getNextOccurrence(alarm, now);
              return (
                <Card key={alarm.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      spacing={2}
                    >
                      <Box>
                        <Typography variant="h3" sx={{ fontWeight: 600 }}>
                          {alarm.time}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {alarm.label || "未命名闹钟"}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                          {DAY_OPTIONS.map((option) => (
                            <Chip
                              key={option.value}
                              label={option.short}
                              size="small"
                              color={alarm.days.length ? "primary" : "default"}
                              variant={
                                alarm.days.length === 0 || alarm.days.includes(option.value)
                                  ? "filled"
                                  : "outlined"
                              }
                              sx={{
                                borderRadius: 1,
                                opacity:
                                  alarm.days.length === 0 || alarm.days.includes(option.value) ? 1 : 0.4,
                              }}
                            />
                          ))}
                        </Stack>
                        <Typography variant="body2" color="secondary" sx={{ mt: 1, visibility: alarm.enabled ? "visible" : "hidden" }} >
                          {next && formatRelative(next, now)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={alarm.enabled}
                          onChange={() => handleToggle(alarm.id)}
                          inputProps={{ "aria-label": "启用或关闭闹钟" }}
                        />
                        <Tooltip title="删除">
                          <IconButton color="inherit" onClick={() => handleDelete(alarm.id)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
            {alarms.length === 0 && (
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <NotificationsActiveIcon color="disabled" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography color="text.secondary">点击右下角按钮添加第一个闹钟</Typography>
                </CardContent>
              </Card>
            )}
          </Stack>
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>新建闹钟</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="标签"
              value={newAlarm.label}
              onChange={(e) => setNewAlarm((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="例如：起床、会议、喝水"
              fullWidth
            />
            <TextField
              label="时间"
              type="time"
              value={newAlarm.time}
              onChange={(e) => setNewAlarm((prev) => ({ ...prev, time: e.target.value }))}
              inputProps={{ step: 300 }}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                重复
              </Typography>
              <ToggleButtonGroup value={newAlarm.days} onChange={handleDayChange} color="primary" sx={{ flexWrap: "wrap" }}>
                {DAY_OPTIONS.map((option) => (
                  <ToggleButton key={option.value} value={option.value} sx={{ flex: 1, minWidth: 80 }}>
                    {option.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary">
                不选择即表示每天提醒
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateAlarm} disabled={!newAlarm.time}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App;
