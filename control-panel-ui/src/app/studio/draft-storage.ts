import type { Plan } from "./types";

export const DRAFT_KEY = "qlabs-studio-draft-v1";
const actions = new Set(["navigate", "click", "fill", "assert_text", "assert_url"]);

export function readDraft(storage: Pick<Storage, "getItem">): { plan: Plan; text: string; target: string } | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw || raw.length > 100000) return null;
    const value = JSON.parse(raw);
    if (typeof value?.plan?.name !== "string" || value.plan.name.length > 120 || !Array.isArray(value.plan.steps) || value.plan.steps.length > 50) return null;
    if (!value.plan.steps.every((step: Record<string, unknown>) => step && actions.has(String(step.action)) && ["path", "selector", "value", "expected"].every(key => step[key] === undefined || (typeof step[key] === "string" && step[key].length <= 2048)))) return null;
    if (typeof value.text !== "string" || value.text.length > 6000 || typeof value.target !== "string" || value.target.length > 64) return null;
    return value;
  } catch { return null; }
}
