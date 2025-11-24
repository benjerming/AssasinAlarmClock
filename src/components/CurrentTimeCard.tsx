import {
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import type { NextAlarmInfo } from "../types/alarm";
import { formatRelative } from "../utils/alarm";

type CurrentTimeCardProps = {
  now: Date;
  nextAlarm: NextAlarmInfo | null;
};

export const CurrentTimeCard = ({ now, nextAlarm }: CurrentTimeCardProps) => (
  <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
    <CardContent>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems="center"
        justifyContent="stretch"
        spacing={2}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="overline" color="text.secondary">
            当前时间
          </Typography>
          <Typography variant="h2" sx={{ fontWeight: 600 }}>
            {now.toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
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
        <Divider
          flexItem
          orientation="vertical"
          sx={{ display: { xs: "none", sm: "block" } }}
        />
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
);
