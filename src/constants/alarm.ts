import type { AlarmMode, DayValue } from "../types/alarm";

export const DAY_ORDER: DayValue[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const DAY_OPTIONS: { value: DayValue; label: string; short: string }[] = [
  { value: "mon", label: "周一", short: "一" },
  { value: "tue", label: "周二", short: "二" },
  { value: "wed", label: "周三", short: "三" },
  { value: "thu", label: "周四", short: "四" },
  { value: "fri", label: "周五", short: "五" },
  { value: "sat", label: "周六", short: "六" },
  { value: "sun", label: "周日", short: "日" },
];

export const DEFAULT_ALARM_MODE: AlarmMode = "custom";

export const STORAGE_KEY = "assassin-alarm-clock:alarms";
