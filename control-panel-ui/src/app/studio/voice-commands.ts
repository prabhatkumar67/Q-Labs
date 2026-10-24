import type { Target } from "./types";

export type Command =
  | { type: "run"; targetId?: string; watch?: boolean }
  | { type: "target"; targetId: string }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "export" };

const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** Picks the app a phrase names: "fixed", "the broken build", or words from a custom app name. */
export function matchTarget(phrase: string, targets: Target[]): string | undefined {
  const said = words(phrase).replace(/\b(the|build|version|app|one)\b/g, " ").trim();
  if (!said) return undefined;
  let best: { id: string; score: number } | undefined;
  for (const target of targets) {
    const name = words(target.name);
    const score = said.split(" ").filter(word => word.length > 2 && name.includes(word)).length;
    if (score && (!best || score > best.score)) best = { id: target.id, score };
  }
  return best?.id;
}

/**
 * Short spoken commands. Anything longer or unrecognised is treated as a description of the test.
 * Kept strict on purpose, so "run the checkout and check the total" still drafts steps.
 */
export function parseCommand(text: string, targets: Target[]): Command | null {
  let said = words(text).replace(/^(ok|okay|now|so|and|alright|great|cool)\s+/, "").replace(/\s+(please|now)$/, "");
  if (said.split(" ").length > 11) return null;

  // "watch it run", "run it and show me", "run it on the fixed build so I can watch"
  const watch = /\b(watch|show me|let me see|visible)\b/.test(said);
  said = said
    .replace(/^(?:let me )?watch(?: it)?(?: run)?\b/, "run")
    .replace(/\s*(?:and|so i can|while i)?\s*(?:show me|watch(?: it)?|let me see(?: it)?)$/, "")
    .replace(/\s+(?:in a |with a )?visible(?: browser)?$/, "")
    .trim();

  const run = said.match(/^(?:re ?run|run|test|try)(?: it| this| that| the test| again| it again)*(?: (?:on|against|with|in|using) (.+))?$/);
  if (run) return { type: "run", targetId: run[1] ? matchTarget(run[1], targets) : undefined, watch };

  const target = said.match(/^(?:switch|change|use|go|point it)(?: (?:to|over to|the))* (.+)$/);
  if (target) {
    const targetId = matchTarget(target[1], targets);
    if (targetId) return { type: "target", targetId };
  }
  if (/^(undo|undo that|go back|revert|revert that)$/.test(said)) return { type: "undo" };
  if (/^(start over|new test|clear( the test| everything)?|reset)$/.test(said)) return { type: "reset" };
  if (/^(export|download)( it| this| the test| the playwright test| as playwright| to playwright)?$/.test(said)) return { type: "export" };
  return null;
}
