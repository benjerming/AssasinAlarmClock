import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
} from "@mui/material";
import { createTheme } from "@mui/material/styles";
import AddAlarmIcon from "@mui/icons-material/AddAlarm";
import AlarmOnIcon from "@mui/icons-material/AlarmOn";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import "./App.css";
import { useChinaWorkdays } from "./hooks/useChinaWorkdays";

type DayValue = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
type AlarmMode = "custom" | "workday";

type Alarm = {
  id: string;
  label: string;
  time: string; // HH:mm
  days: DayValue[];
  enabled: boolean;
  mode: AlarmMode;
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
const DEFAULT_ALARM_MODE: AlarmMode = "custom";
const STORAGE_KEY = "assassin-alarm-clock:alarms";

const parseStoredAlarms = (value: unknown): Alarm[] => {
  if (!Array.isArray(value)) return initialAlarms;
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const { id, label, time, days, enabled, mode } = item as Partial<Alarm>;
      if (typeof time !== "string") return null;
      return {
        id: typeof id === "string" ? id : generateId(),
        label: typeof label === "string" ? label : "新闹钟",
        time,
        days: Array.isArray(days)
          ? days.filter((day): day is DayValue => DAY_ORDER.includes(day as DayValue))
          : [],
        enabled: typeof enabled === "boolean" ? enabled : true,
        mode: mode === "workday" ? "workday" : DEFAULT_ALARM_MODE,
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

type NextOccurrenceOptions = {
  isWorkday?: (date: Date) => boolean;
};

const defaultWorkdayChecker = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

const getNextOccurrence = (alarm: Alarm, now: Date, options: NextOccurrenceOptions = {}): Date | null => {
  if (!alarm.enabled) return null;
  const [hour, minute] = alarm.time.split(":").map(Number);
  const activeDays = alarm.days.length ? alarm.days : DAY_ORDER;
  const isWorkday = options.isWorkday ?? defaultWorkdayChecker;
  const searchRange = alarm.mode === "workday" ? 90 : 14;
  let fallback: Date | null = null;

  for (let i = 0; i < searchRange; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hour, minute, 0, 0);
    if (candidate <= now) continue;
    if (!fallback) {
      fallback = new Date(candidate);
    }

    if (alarm.mode === "workday") {
      if (isWorkday(candidate)) {
        return candidate;
      }
    } else {
      const dayValue = DAY_ORDER[candidate.getDay()];
      if (activeDays.includes(dayValue)) {
        return candidate;
      }
    }
  }

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
    mode: DEFAULT_ALARM_MODE as AlarmMode,
  });
  const chinaWorkdays = useChinaWorkdays();

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

  const handleDayChange = (_: React.MouseEvent<HTMLElement>, values: DayValue[]) => {
    setNewAlarm((prev) => ({ ...prev, days: values }));
  };

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, value: AlarmMode | null) => {
    if (!value) return;
    setNewAlarm((prev) => ({
      ...prev,
      mode: value,
      days: value === "custom" ? prev.days : [],
    }));
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

          <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    工作日同步
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    中国法定节假日
                  </Typography>
                  <Typography color="text.secondary">
                    {chinaWorkdays.hasData
                      ? `已同步 · 数据更新时间 ${chinaWorkdays.lastUpdatedText ?? "未知"}`
                      : "尚未同步，暂按周一至周五计算工作日"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    数据来源：
                    <Box
                      component="a"
                      href={chinaWorkdays.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ color: "primary.main", ml: 0.5 }}
                    >
                      china-holiday-calender
                    </Box>
                  </Typography>
                </Box>
                <Stack spacing={1} alignItems={{ xs: "stretch", sm: "flex-end" }} sx={{ minWidth: { sm: 220 } }}>
                  <Chip
                    label={
                      chinaWorkdays.loading
                        ? "同步中..."
                        : chinaWorkdays.error
                          ? "同步失败，使用默认规则"
                          : "已同步"
                    }
                    color={
                      chinaWorkdays.loading
                        ? "default"
                        : chinaWorkdays.error
                          ? "warning"
                          : "success"
                    }
                  />
                  <Button
                    variant="outlined"
                    onClick={chinaWorkdays.refresh}
                    disabled={chinaWorkdays.loading}
                    fullWidth
                  >
                    {chinaWorkdays.loading ? "同步中..." : "重新同步"}
                  </Button>
                </Stack>
              </Stack>
              {chinaWorkdays.error && (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  {chinaWorkdays.error}
                </Typography>
              )}
            </CardContent>
          </Card>

          <Stack spacing={2}>
            {alarms.map((alarm) => {
              const next = getNextOccurrence(alarm, now, { isWorkday: chinaWorkdays.isWorkday });
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
                        {alarm.mode === "workday" ? (
                          <Chip
                            label="工作日 · 自动跳过法定节假日"
                            size="small"
                            color="secondary"
                            sx={{ mt: 1, borderRadius: 1 }}
                          />
                        ) : (
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
                        )}
                        <Typography variant="body2" color="secondary" sx={{ mt: 1, visibility: alarm.enabled ? "visible" : "hidden" }} >
                          {next && formatRelative(next, now)}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Switch
                          checked={alarm.enabled}
                          onChange={() => handleToggle(alarm.id)}
                          slotProps={{ input: { "aria-label": "启用或关闭闹钟" } }}
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
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
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
              slotProps={{ input: { inputProps: { step: 300 } } }}
            />
            <Box>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                重复策略
              </Typography>
              <ToggleButtonGroup
                value={newAlarm.mode}
                exclusive
                onChange={handleModeChange}
                color="primary"
                sx={{ flexWrap: "wrap", mb: 2 }}
              >
                <ToggleButton value="custom" sx={{ flex: 1, minWidth: 120 }}>
                  自定义
                </ToggleButton>
                <ToggleButton
                  value="workday"
                  sx={{ flex: 1, minWidth: 120 }}
                  disabled={!chinaWorkdays.hasData && chinaWorkdays.loading}
                >
                  工作日（跳过节假日）
                </ToggleButton>
              </ToggleButtonGroup>
              {newAlarm.mode === "custom" ? (
                <>
                  <ToggleButtonGroup
                    value={newAlarm.days}
                    onChange={handleDayChange}
                    color="primary"
                    sx={{ flexWrap: "wrap" }}
                  >
                    {DAY_OPTIONS.map((option) => (
                      <ToggleButton key={option.value} value={option.value} sx={{ flex: 1, minWidth: 80 }}>
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary">
                    不选择即表示每天提醒
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  将在中国法定工作日自动响铃，节假日与调休信息来自网络同步
                  {!chinaWorkdays.hasData ? "（当前暂按默认规则计算）" : ""}
                </Typography>
              )}
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
