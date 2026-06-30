import test from "node:test";
import { businessRuleCases, createAssertions } from "../scripts/business-rule-check-lib.mjs";

for (const ruleCase of businessRuleCases) {
  test(ruleCase.name, () => {
    ruleCase.run(createAssertions());
  });
}
