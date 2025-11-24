import { DEFAULT_ALARM_MODE, DAY_ORDER, STORAGE_KEY } from "../constants/alarm";
import type { Alarm, DayValue } from "../types/alarm";

type TauriWindow = Window & {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
  __TAURI_METADATA__?: unknown;
  __TAURI_IPC__?: unknown;
};

export const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const initialAlarms: Alarm[] = [];

export const parseStoredAlarms = (value: unknown): Alarm[] => {
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
          ? (days.filter((day): day is DayValue => DAY_ORDER.includes(day as DayValue)) as DayValue[])
          : [],
        enabled: typeof enabled === "boolean" ? enabled : true,
        mode: mode === "workday" ? "workday" : DEFAULT_ALARM_MODE,
      };
    })
    .filter(Boolean) as Alarm[];
};

export const loadStoredAlarms = (): Alarm[] => {
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

export const persistAlarms = (alarms: Alarm[]) => {
  if (typeof window === "undefined" || !("localStorage" in window)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  } catch (error) {
    console.warn("写入闹钟持久化数据失败", error);
  }
};

export const getRoundedTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5 - (now.getMinutes() % 5 || 5), 0, 0);
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const formatRelative = (target: Date, from: Date) => {
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

export const isTauriEnvironment = () => {
  if (typeof window === "undefined") return false;
  const candidate = window as TauriWindow;
  return Boolean(
    candidate.__TAURI__ ??
      candidate.__TAURI_INTERNALS__ ??
      candidate.__TAURI_METADATA__ ??
      candidate.__TAURI_IPC__,
  );
};

export const formatMinuteKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const shouldTriggerAlarm = (
  alarm: Alarm,
  current: Date,
  isWorkday: (date: Date) => boolean,
) => {
  if (!alarm.enabled) return false;
  const [hour, minute] = alarm.time.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return false;
  if (current.getHours() !== hour || current.getMinutes() !== minute) return false;

  if (alarm.mode === "workday") {
    return isWorkday(current);
  }

  if (alarm.days.length === 0) return true;
  const today = DAY_ORDER[current.getDay()];
  return alarm.days.includes(today);
};

export type NextOccurrenceOptions = {
  isWorkday?: (date: Date) => boolean;
};

export const defaultWorkdayChecker = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

export const getNextOccurrence = (alarm: Alarm, now: Date, options: NextOccurrenceOptions = {}) => {
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

