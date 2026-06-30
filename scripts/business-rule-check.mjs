import { businessRuleCases, createAssertions } from "./business-rule-check-lib.mjs";

const assert = createAssertions();
let passed = 0;

for (const check of businessRuleCases) {
  check.run(assert);
  passed += 1;
  console.log(`PASS ${check.name}`);
}

console.log(`\nBusiness rule checks passed: ${passed}/${businessRuleCases.length}`);
