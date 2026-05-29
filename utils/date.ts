import { differenceInCalendarDays, format, parseISO } from "date-fns";

export const householdTimeZone = "Asia/Bangkok";

export function formatShortDate(value: string) {
  return format(parseISO(value), "dd MMM");
}

export function inclusiveDays(startDate: string, endDate: string) {
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1);
}

export function remainingInclusiveDays(endDate: string, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(parseISO(endDate), now) + 1);
}

export function getCurrentDateStringInTimeZone(timeZone = householdTimeZone, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(now);
}

export function getCurrentDateInTimeZone(timeZone = householdTimeZone, now = new Date()) {
  const currentDate = getCurrentDateStringInTimeZone(timeZone, now);
  return new Date(`${currentDate}T12:00:00`);
}
