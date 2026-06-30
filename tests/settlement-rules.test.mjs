import test from "node:test";
import { createAssertions, settlementRuleCases } from "../scripts/settlement-rule-check-lib.mjs";

for (const ruleCase of settlementRuleCases) {
  test(ruleCase.name, () => {
    ruleCase.run(createAssertions());
  });
}
