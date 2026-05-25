export const householdAccessCookieName = "flowpay_household_access";

export function getHouseholdAccessCode() {
  return process.env.FLOWPAY_HOUSEHOLD_CODE ?? "";
}

export function isHouseholdAccessConfigured() {
  return Boolean(getHouseholdAccessCode());
}
