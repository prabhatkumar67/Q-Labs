export type Action = "navigate" | "click" | "fill" | "assert_text" | "assert_url";

export type Step = {
  action: Action;
  path?: string;
  selector?: string;
  value?: string;
  expected?: string;
};

export type Plan = { name: string; steps: Step[] };

export type SavedPlan = { id: string; body: Plan; created_at: string; name: string };

export type Result = {
  index: number;
  action: string;
  status: string;
  expected?: string;
  actual?: unknown;
  reason?: string;
  screenshot?: string;
};

export type Run = {
  id: string;
  plan_id: string;
  target: string;
  status: string;
  created_at: string;
  results: Result[];
  reason?: string;
};

export type Target = { id: string; name: string; url: string; built_in?: boolean };

export type MapElement = {
  selector: string;
  tag: string;
  type?: string;
  role?: string;
  label?: string;
  text?: string;
  placeholder?: string;
  live?: boolean;
};

export type PageMap = { url: string; title: string; elements: MapElement[] };

export type Draft = { plan: Plan; summary: string; unmapped: number[]; grounded: boolean };

/** Words from the page that speech recognition should expect, such as button labels and codes. */
export function pageKeyterms(map: PageMap | null): string[] {
  const terms = new Set(["Playwright", "assertion", "selector", "Q Labs"]);
  for (const element of map?.elements ?? []) {
    for (const value of [element.label, element.text, element.placeholder]) {
      if (value && value.split(" ").length <= 4 && value.length <= 40) terms.add(value);
    }
  }
  return [...terms].slice(0, 40);
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const SAMPLE: Plan = {
  name: "Checkout requires an email",
  steps: [
    { action: "click", selector: "#submit-order" },
    { action: "assert_text", selector: "#checkout-message", expected: "Email is required" },
  ],
};

export const EMPTY_PLAN: Plan = { name: "Untitled test", steps: [] };

export const EXAMPLES = [
  "Leave the email empty and press Place order. It should say Email is required.",
  "Also apply the code SAVE10 and check the total drops to $21.60.",
  "Run it on the fixed build.",
];

export const ACTION_LABELS: Record<Action, string> = {
  navigate: "Open page",
  click: "Click",
  fill: "Fill field",
  assert_text: "Check text",
  assert_url: "Check URL",
};

export const isAssertion = (step: { action: string }) => step.action.startsWith("assert_");

export const isActive = (run: Run | null) => !!run && (run.status === "queued" || run.status === "running");

export function initialStep(action: Action): Step {
  if (action === "navigate" || action === "assert_url") return { action, path: "/" };
  if (action === "fill") return { action, selector: "", value: "" };
  if (action === "assert_text") return { action, selector: "", expected: "" };
  return { action, selector: "" };
}

export function download(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatActual(actual: unknown): string {
  if (typeof actual === "string") return actual;
  if (Array.isArray(actual)) return actual.join(" | ");
  if (actual === undefined || actual === null) return "Not observed";
  return JSON.stringify(actual);
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "sample-broken" style ids and ".../broken" URLs both read as a short human label. */
export function targetLabel(target: string, targets: Target[]): string {
  const known = targets.find(t => t.url === target || t.id === target);
  if (known) return known.name;
  if (target.endsWith("/broken")) return "Demo store, broken build";
  if (target.endsWith("/fixed")) return "Demo store, fixed build";
  return target;
}
