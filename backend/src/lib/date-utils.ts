/**
 * Date and Time utilities for MENTNEO Sales Intelligence.
 * Standardizes display in Indian Standard Time (IST = UTC+5:30).
 */

export function formatIST(dateInput: Date | string | null | undefined, includeTime = true): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime && {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };

  return new Intl.DateTimeFormat("en-IN", options).format(date);
}

export function formatISTDateOnly(dateInput: Date | string | null | undefined): string {
  return formatIST(dateInput, false);
}

export function getISTNow(): Date {
  return new Date();
}

export type DateRangePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "previousMonth" | "custom";

export function getDateRangeFilter(
  preset: DateRangePreset = "thisMonth",
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date; label: string } {
  const now = new Date();

  // Create start and end of today in local/IST context
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case "today":
      return {
        startDate: startOfToday,
        endDate: endOfToday,
        label: "Today",
      };

    case "yesterday": {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(endOfToday);
      endOfYesterday.setDate(endOfYesterday.getDate() - 1);
      return {
        startDate: startOfYesterday,
        endDate: endOfYesterday,
        label: "Yesterday",
      };
    }

    case "thisWeek": {
      const day = startOfToday.getDay(); // 0 is Sunday
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
      return {
        startDate: startOfWeek,
        endDate: endOfToday,
        label: "This Week",
      };
    }

    case "thisMonth": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        startDate: startOfMonth,
        endDate: endOfToday,
        label: "This Month",
      };
    }

    case "previousMonth": {
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: startOfPrevMonth,
        endDate: endOfPrevMonth,
        label: "Previous Month",
      };
    }

    case "custom": {
      const start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = customEnd ? new Date(customEnd) : endOfToday;
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return {
        startDate: start,
        endDate: end,
        label: `${formatISTDateOnly(start)} - ${formatISTDateOnly(end)}`,
      };
    }

    default:
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        endDate: endOfToday,
        label: "This Month",
      };
  }
}
