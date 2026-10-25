import test from "node:test";
import assert from "node:assert/strict";
import { openFailures } from "../src/app/dashboard/metrics.ts";

test("a passing different test with the same name does not close a failure", () => {
  const plan = expected => ({ name: "Email check", steps: [{ action: "assert_text", selector: "#message", expected }] });
  const plans = [{ id: "old", name: "Email check", body: plan("Email required") }, { id: "new", name: "Email check", body: plan("Order confirmed") }];
  const runs = [{ id: "r2", plan_id: "new", target: "http://localhost", status: "passed", created_at: "2026-10-25T12:00:00Z", results: [] },
    { id: "r1", plan_id: "old", target: "http://localhost", status: "failed", created_at: "2026-10-25T11:00:00Z", results: [{ index: 0, action: "assert_text", status: "failed" }] }];
  assert.equal(openFailures(runs, plans, []).length, 1);
});

test("passing the same contract resolves its prior failure", () => {
  const body = { name: "Email check", steps: [{ action: "assert_text", selector: "#message", expected: "Email required" }] };
  const plans = [{ id: "old", name: body.name, body }, { id: "new", name: body.name, body }];
  const runs = [{ id: "r2", plan_id: "new", target: "http://localhost", status: "passed", created_at: "2026-10-25T12:00:00Z", results: [] },
    { id: "r1", plan_id: "old", target: "http://localhost", status: "failed", created_at: "2026-10-25T11:00:00Z", results: [{ index: 0, action: "assert_text", status: "failed" }] }];
  assert.equal(openFailures(runs, plans, []).length, 0);
});
