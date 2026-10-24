export type EntityType = "app" | "version" | "scenario" | "workflow" | "sandbox";

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  metadata: Record<string, string>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

export const ENTITY_COLORS: Record<EntityType, string> = {
  app: "#3DDC91",
  version: "#2BAD72",
  scenario: "#FFCD48",
  workflow: "#60A5FA",
  sandbox: "#E54F38",
};

export const ENTITY_RADII: Record<EntityType, number> = {
  app: 56,
  version: 40,
  scenario: 34,
  workflow: 30,
  sandbox: 34,
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  app: "App",
  version: "Version",
  scenario: "Scenario",
  workflow: "Workflow",
  sandbox: "Sandbox",
};
