import { useCallback, useEffect, useMemo, useState } from "react";

const HOLIDAY_API_URL =
  "https://cdn.jsdelivr.net/gh/lanceliao/china-holiday-calender/holidayAPI.json";

type HolidayEntry = {
  Name: string;
  StartDate: string;
  EndDate: string;
  Duration: number;
  CompDays: string[];
  URL: string;
  Memo: string;
};

type HolidayApiResponse = {
  Name: string;
  Version: string;
  Generated?: string;
  Timezone?: string;
  Author?: string;
  URL?: string;
  Years: Record<string, HolidayEntry[]>;
};

type CalendarSets = {
  holidays: Set<string>;
  workdays: Set<string>;
  generated?: string;
};

const parseDateString = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildCalendarSets = (payload: HolidayApiResponse): CalendarSets => {
  const holidays = new Set<string>();
  const workdays = new Set<string>();

  Object.values(payload.Years || {}).forEach((entries) => {
    entries.forEach((entry) => {
      if (entry.StartDate && entry.EndDate) {
        const start = parseDateString(entry.StartDate);
        const end = parseDateString(entry.EndDate);
        for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
          holidays.add(formatDateKey(cursor));
        }
      }
      entry.CompDays?.forEach((day) => {
        if (day) workdays.add(day);
      });
    });
  });

  return { holidays, workdays, generated: payload.Generated };
};

const defaultIsWorkday = (date: Date) => {
  const day = date.getDay();
  return day >= 1 && day <= 5;
};

export const useChinaWorkdays = () => {
  const [calendar, setCalendar] = useState<CalendarSets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(HOLIDAY_API_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`同步失败（${response.status}）`);
        }
        return response.json() as Promise<HolidayApiResponse>;
      })
      .then((payload) => {
        if (cancelled) return;
        setCalendar(buildCalendarSets(payload));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.name === "AbortError") return;
        setError(err.message || "同步失败，请稍后重试");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [refreshIndex]);

  const isWorkday = useCallback(
    (date: Date) => {
      if (!calendar) return defaultIsWorkday(date);
      const key = formatDateKey(date);
      if (calendar.workdays.has(key)) return true;
      if (calendar.holidays.has(key)) return false;
      return defaultIsWorkday(date);
    },
    [calendar],
  );

  const isHoliday = useCallback(
    (date: Date) => {
      if (!calendar) return !defaultIsWorkday(date);
      const key = formatDateKey(date);
      if (calendar.workdays.has(key)) return false;
      return calendar.holidays.has(key);
    },
    [calendar],
  );

  const lastUpdatedText = useMemo(() => {
    if (!calendar?.generated) return null;
    const generated = calendar.generated;
    const year = Number(generated.slice(0, 4));
    const month = Number(generated.slice(4, 6)) - 1;
    const day = Number(generated.slice(6, 8));
    const hour = Number(generated.slice(9, 11));
    const minute = Number(generated.slice(11, 13));
    const second = Number(generated.slice(13, 15));
    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    return date.toLocaleString("zh-CN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [calendar?.generated]);

  return {
    loading,
    error,
    hasData: !!calendar,
    lastUpdatedText,
    isWorkday,
    isHoliday,
    refresh: () => setRefreshIndex((prev) => prev + 1),
    sourceUrl: HOLIDAY_API_URL,
  };
};

export type ChinaWorkdayHelper = ReturnType<typeof useChinaWorkdays>;
