import { createAssertions, settlementRuleCases } from "./settlement-rule-check-lib.mjs";

const assert = createAssertions();
let passed = 0;

for (const check of settlementRuleCases) {
  check.run(assert);
  passed += 1;
  console.log(`PASS ${check.name}`);
}

console.log(`\nSettlement rule checks passed: ${passed}/${settlementRuleCases.length}`);
