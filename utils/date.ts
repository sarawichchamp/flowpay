import { differenceInCalendarDays, format, parseISO } from "date-fns";

export function formatShortDate(value: string) {
  return format(parseISO(value), "dd MMM");
}

export function inclusiveDays(startDate: string, endDate: string) {
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1);
}

export function remainingInclusiveDays(endDate: string, now = new Date()) {
  return Math.max(0, differenceInCalendarDays(parseISO(endDate), now) + 1);
}
