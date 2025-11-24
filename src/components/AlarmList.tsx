import {
  Card,
  CardContent,
  Chip,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import type { Alarm } from "../types/alarm";
import type { ChinaWorkdayHelper } from "../hooks/useChinaWorkdays";
import { DAY_OPTIONS } from "../constants/alarm";
import { formatRelative, getNextOccurrence } from "../utils/alarm";

type AlarmListProps = {
  alarms: Alarm[];
  now: Date;
  chinaWorkdays: ChinaWorkdayHelper;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export const AlarmList = ({ alarms, now, chinaWorkdays, onToggle, onDelete }: AlarmListProps) => (
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
              <Stack spacing={1}>
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
                    sx={{ mt: 1, borderRadius: 1, alignSelf: "flex-start" }}
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
                <Typography
                  variant="body2"
                  color="secondary"
                  sx={{ mt: 1, visibility: alarm.enabled ? "visible" : "hidden" }}
                >
                  {next && formatRelative(next, now)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <Switch
                  checked={alarm.enabled}
                  onChange={() => onToggle(alarm.id)}
                  slotProps={{ input: { "aria-label": "启用或关闭闹钟" } }}
                />
                <Tooltip title="删除">
                  <IconButton color="inherit" onClick={() => onDelete(alarm.id)}>
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
);
