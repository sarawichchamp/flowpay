import { addMonths, endOfMonth, format, getDay, isBefore, setDate, startOfDay, subDays } from "date-fns";

function clampPayrollDay(baseDate: Date, payrollDayOfMonth: number) {
  return Math.min(payrollDayOfMonth, endOfMonth(baseDate).getDate());
}

export function getAdjustedPayrollDate(baseDate: Date, payrollDayOfMonth: number) {
  const scheduled = startOfDay(setDate(baseDate, clampPayrollDay(baseDate, payrollDayOfMonth)));
  const weekday = getDay(scheduled);

  if (weekday === 6) return subDays(scheduled, 1);
  if (weekday === 0) return subDays(scheduled, 2);
  return scheduled;
}

export function getBillingCycleFromPayrollDate(referenceDate: Date, payrollDayOfMonth: number) {
  const normalizedReference = startOfDay(referenceDate);
  const currentMonthPayroll = getAdjustedPayrollDate(normalizedReference, payrollDayOfMonth);
  const cycleStart = isBefore(normalizedReference, currentMonthPayroll)
    ? getAdjustedPayrollDate(addMonths(normalizedReference, -1), payrollDayOfMonth)
    : currentMonthPayroll;
  const nextPayroll = getAdjustedPayrollDate(addMonths(cycleStart, 1), payrollDayOfMonth);
  const cycleEnd = subDays(nextPayroll, 1);

  return {
    startDate: format(cycleStart, "yyyy-MM-dd"),
    endDate: format(cycleEnd, "yyyy-MM-dd"),
    createdAt: `${format(cycleStart, "yyyy-MM-dd")}T00:00:00.000Z`
  };
}
