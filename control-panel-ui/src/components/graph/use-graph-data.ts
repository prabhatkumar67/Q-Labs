"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { GraphNode, GraphEdge } from "./graph-types";

interface App {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version_tag: string;
  docker_image_name: string;
  created_at: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  app_version_id: string | null;
  parent_scenario_id: string | null;
  created_at: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  app_version_id: string;
  scenario_id: string;
  created_at: string;
}

interface Sandbox {
  id: string;
  scenario_id: string | null;
  container_id: string;
  port: number;
  sandbox_url: string;
  status: string;
  app_version_id: string | null;
  name: string | null;
  created_at: string;
}

export function useGraphData() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sandboxPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildGraph = useCallback(
    (
      apps: App[],
      versionsByApp: Record<string, AppVersion[]>,
      scenarios: Scenario[],
      workflows: Workflow[],
      sandboxes: Sandbox[]
    ) => {
      const newNodes: GraphNode[] = [];
      const newEdges: GraphEdge[] = [];

      // Apps
      for (const app of apps) {
        newNodes.push({
          id: app.id,
          type: "app",
          label: app.name,
          metadata: { description: app.description, created: app.created_at },
        });
      }

      // Versions
      for (const [appId, versions] of Object.entries(versionsByApp)) {
        for (const v of versions) {
          newNodes.push({
            id: v.id,
            type: "version",
            label: v.version_tag,
            metadata: {
              app_id: appId,
              image: v.docker_image_name,
              created: v.created_at,
            },
          });
          newEdges.push({ source: appId, target: v.id, type: "app→version" });
        }
      }

      // Scenarios
      for (const s of scenarios) {
        newNodes.push({
          id: s.id,
          type: "scenario",
          label: s.name,
          metadata: {
            description: s.description,
            created: s.created_at,
          },
        });
        if (s.app_version_id) {
          newEdges.push({
            source: s.app_version_id,
            target: s.id,
            type: "version→scenario",
          });
        }
      }

      // Workflows — only connect to scenario
      for (const w of workflows) {
        newNodes.push({
          id: w.id,
          type: "workflow",
          label: w.name,
          metadata: {
            scenario_id: w.scenario_id,
            description: w.description,
            created: w.created_at,
          },
        });
        if (w.scenario_id) {
          newEdges.push({
            source: w.scenario_id,
            target: w.id,
            type: "scenario→workflow",
          });
        }
      }

      // Sandboxes
      for (const sb of sandboxes) {
        newNodes.push({
          id: sb.id,
          type: "sandbox",
          label: sb.name || `Port ${sb.port}`,
          metadata: {
            status: sb.status,
            url: sb.sandbox_url,
            container: sb.container_id.slice(0, 12),
            created: sb.created_at,
          },
        });
        if (sb.scenario_id) {
          newEdges.push({
            source: sb.scenario_id,
            target: sb.id,
            type: "scenario→sandbox",
          });
        }
      }

      // Only include edges whose source and target both exist
      const nodeIds = new Set(newNodes.map((n) => n.id));
      const validEdges = newEdges.filter(
        (e) =>
          nodeIds.has(typeof e.source === "string" ? e.source : e.source.id) &&
          nodeIds.has(typeof e.target === "string" ? e.target : e.target.id)
      );

      setNodes(newNodes);
      setEdges(validEdges);
    },
    []
  );

  const fetchAll = useCallback(async () => {
    try {
      const [apps, scenarios, workflows, sandboxes] = await Promise.all([
        api("/api/apps") as Promise<App[]>,
        api("/api/scenarios") as Promise<Scenario[]>,
        api("/api/workflows") as Promise<Workflow[]>,
        api("/api/sandboxes") as Promise<Sandbox[]>,
      ]);

      // Fetch versions for each app in parallel
      const versionEntries = await Promise.all(
        apps.map(async (app) => {
          const versions = (await api(
            `/api/apps/${app.id}/versions`
          )) as AppVersion[];
          return [app.id, versions] as const;
        })
      );
      const versionsByApp: Record<string, AppVersion[]> = Object.fromEntries(
        versionEntries
      );

      buildGraph(apps, versionsByApp, scenarios, workflows, sandboxes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [buildGraph]);

  // Poll sandboxes every 10s
  const pollSandboxes = useCallback(async () => {
    try {
      const sandboxes = (await api("/api/sandboxes")) as Sandbox[];
      setNodes((prev) => {
        const nonSandbox = prev.filter((n) => n.type !== "sandbox");
        const sandboxNodes: GraphNode[] = sandboxes.map((sb) => {
          const existing = prev.find((n) => n.id === sb.id);
          return {
            id: sb.id,
            type: "sandbox" as const,
            label: sb.name || `Port ${sb.port}`,
            metadata: {
              status: sb.status,
              url: sb.sandbox_url,
              container: sb.container_id.slice(0, 12),
              created: sb.created_at,
            },
            // Preserve positions if node already exists
            x: existing?.x,
            y: existing?.y,
          };
        });
        return [...nonSandbox, ...sandboxNodes];
      });

      setEdges((prev) => {
        const nonSandbox = prev.filter((e) => {
          const t = typeof e.type === "string" ? e.type : "";
          return !t.includes("sandbox");
        });
        const sandboxEdges: GraphEdge[] = sandboxes
          .filter((sb) => sb.scenario_id)
          .map((sb) => ({
            source: sb.scenario_id!,
            target: sb.id,
            type: "scenario→sandbox",
          }));
        return [...nonSandbox, ...sandboxEdges];
      });
    } catch {
      // Silently fail on poll errors
    }
  }, []);

  useEffect(() => {
    fetchAll();

    sandboxPollRef.current = setInterval(pollSandboxes, 10000);
    return () => {
      if (sandboxPollRef.current) clearInterval(sandboxPollRef.current);
    };
  }, [fetchAll, pollSandboxes]);

  return { nodes, edges, loading, error, refetch: fetchAll };
}
