import { MouseEvent } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { ChinaWorkdayHelper } from "../hooks/useChinaWorkdays";
import { DAY_OPTIONS } from "../constants/alarm";
import type { AlarmMode, DayValue, NewAlarmDraft } from "../types/alarm";

type NewAlarmDialogProps = {
  open: boolean;
  newAlarm: NewAlarmDraft;
  chinaWorkdays: ChinaWorkdayHelper;
  onClose: () => void;
  onSave: () => void;
  onChange: (draft: NewAlarmDraft) => void;
};

export const NewAlarmDialog = ({
  open,
  newAlarm,
  chinaWorkdays,
  onClose,
  onSave,
  onChange,
}: NewAlarmDialogProps) => {
  const handleDayChange = (_: MouseEvent<HTMLElement>, values: DayValue[]) => {
    onChange({ ...newAlarm, days: values });
  };

  const handleModeChange = (_: MouseEvent<HTMLElement>, value: AlarmMode | null) => {
    if (!value) return;
    onChange({
      ...newAlarm,
      mode: value,
      days: value === "custom" ? newAlarm.days : [],
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
            onChange={(event) => onChange({ ...newAlarm, label: event.target.value })}
            placeholder="例如：起床、会议、喝水"
            fullWidth
          />
          <TextField
            label="时间"
            type="time"
            value={newAlarm.time}
            onChange={(event) => onChange({ ...newAlarm, time: event.target.value })}
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
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={onSave} disabled={!newAlarm.time}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};
