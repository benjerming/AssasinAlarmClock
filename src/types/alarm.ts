export type DayValue = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type AlarmMode = "custom" | "workday";

export type Alarm = {
  id: string;
  label: string;
  time: string;
  days: DayValue[];
  enabled: boolean;
  mode: AlarmMode;
};

export type NextAlarmInfo = {
  alarm: Alarm;
  date: Date;
};

export type NewAlarmDraft = {
  label: string;
  time: string;
  days: DayValue[];
  mode: AlarmMode;
};

