import { users as demoUsers } from "@/data/mock";

export type HouseholdMemberSeed = {
  displayName: string;
  email: string;
};

function getMember(index: 1 | 2): HouseholdMemberSeed | null {
  const email = process.env[`FLOWPAY_MEMBER_${index}_EMAIL`] ?? "";
  const displayName = process.env[`FLOWPAY_MEMBER_${index}_NAME`] ?? "";

  if (!email || !displayName) {
    return null;
  }

  return {
    email: email.trim().toLowerCase(),
    displayName: displayName.trim()
  };
}

export function getConfiguredHouseholdMembers(): [HouseholdMemberSeed, HouseholdMemberSeed] | null {
  const first = getMember(1);
  const second = getMember(2);

  if (!first || !second) {
    return null;
  }

  return [first, second];
}

export function isHouseholdMembersConfigured() {
  return Boolean(getConfiguredHouseholdMembers());
}

export function getProductionHouseholdMembersOrThrow(): [HouseholdMemberSeed, HouseholdMemberSeed] {
  const members = getConfiguredHouseholdMembers();

  if (!members) {
    throw new Error(
      "Missing household member configuration. Set FLOWPAY_MEMBER_1_NAME, FLOWPAY_MEMBER_1_EMAIL, FLOWPAY_MEMBER_2_NAME, and FLOWPAY_MEMBER_2_EMAIL."
    );
  }

  return members;
}

export function getDemoHouseholdMembers(): [HouseholdMemberSeed, HouseholdMemberSeed] {
  return [
    {
      displayName: demoUsers[0].displayName,
      email: (demoUsers[0].email ?? "a@flowpay.local").toLowerCase()
    },
    {
      displayName: demoUsers[1].displayName,
      email: (demoUsers[1].email ?? "b@flowpay.local").toLowerCase()
    }
  ];
}
