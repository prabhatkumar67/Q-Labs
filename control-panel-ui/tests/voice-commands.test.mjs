import test from "node:test";
import assert from "node:assert/strict";
import { matchTarget, parseCommand } from "../src/app/studio/voice-commands.ts";

const targets = [
  { id: "broken", name: "Demo store, broken build", url: "http://localhost/broken" },
  { id: "fixed", name: "Demo store, fixed build", url: "http://localhost/fixed" },
];

test("explicit fixed target is recognized", () => {
  assert.equal(parseCommand("Okay, run it on the fixed build.", targets)?.targetId, "fixed");
});
test("unknown or ambiguous targets never silently run the current app", () => {
  assert.equal(parseCommand("run it on the accounting app", targets)?.type, "clarify");
  assert.equal(parseCommand("run it on the demo store", targets)?.type, "clarify");
  assert.equal(matchTarget("demo store", targets), undefined);
});
test("short commands and watch mode remain supported", () => {
  assert.equal(parseCommand("undo", targets)?.type, "undo");
  assert.equal(parseCommand("run", targets)?.type, "run");
  assert.equal(parseCommand("watch it run", targets)?.watch, true);
  assert.equal(parseCommand("run the checkout and check the total", targets), null);
  assert.equal(parseCommand("use a valid email and check confirmation", targets), null);
});
