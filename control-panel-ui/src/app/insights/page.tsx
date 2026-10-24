"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  FlaskConical,
  Activity,
  Clock,
  Server,
  Box,
} from "lucide-react";

interface Sandbox {
  id: string;
  container_id: string;
  port: number;
  status: string;
  created_at: string;
  name: string | null;
  scenario_id: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  created_at: string;
  parent_scenario_id: string | null;
  walkthrough_steps: unknown[] | null;
}

interface HealthStatus {
  status: string;
  docker: string;
}

export default function InsightsPage() {
  const [sandboxes, setSandboxes] = useState<Sandbox[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api("/api/sandboxes"),
      api("/api/scenarios"),
      api("/api/health").catch(() => null),
      api("/api/apps").catch(() => []),
    ])
      .then(([sbs, scs, h, aps]) => {
        setSandboxes(sbs);
        setScenarios(scs);
        setHealth(h);
        setAppCount(Array.isArray(aps) ? aps.length : 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 skeleton-block" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton-block" />
          ))}
        </div>
        <div className="h-64 skeleton-block" />
      </div>
    );
  }

  const walkthroughScenarios = scenarios.filter((s) => s.parent_scenario_id);
  const baseScenarios = scenarios.filter((s) => !s.parent_scenario_id);
  const withSteps = scenarios.filter((s) => s.walkthrough_steps && (s.walkthrough_steps as unknown[]).length > 0);
  const totalSteps = scenarios.reduce((sum, s) => {
    if (s.walkthrough_steps && Array.isArray(s.walkthrough_steps)) {
      return sum + s.walkthrough_steps.length;
    }
    return sum;
  }, 0);

  // Group sandboxes by scenario
  const scenarioUsage: Record<string, number> = {};
  for (const sb of sandboxes) {
    scenarioUsage[sb.scenario_id] = (scenarioUsage[sb.scenario_id] || 0) + 1;
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Platform overview and usage metrics
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-up" style={{ animationDelay: "50ms" }}>
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Box className="size-4" />
            <span className="text-xs font-medium">Apps</span>
          </div>
          <p className="text-2xl font-semibold">{appCount}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Monitor className="size-4" />
            <span className="text-xs font-medium">Active Sessions</span>
          </div>
          <p className="text-2xl font-semibold">{sandboxes.length}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FlaskConical className="size-4" />
            <span className="text-xs font-medium">Scenarios</span>
          </div>
          <p className="text-2xl font-semibold">{scenarios.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {baseScenarios.length} base / {walkthroughScenarios.length} from walkthroughs
          </p>
        </div>
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="size-4" />
            <span className="text-xs font-medium">Recorded Steps</span>
          </div>
          <p className="text-2xl font-semibold">{totalSteps}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            across {withSteps.length} walkthroughs
          </p>
        </div>
        <div className="bg-card border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Server className="size-4" />
            <span className="text-xs font-medium">Docker</span>
          </div>
          <p className="text-2xl font-semibold capitalize">{health?.docker || "—"}</p>
          <Badge variant={health?.status === "healthy" ? "success" : "error"} className="mt-1">
            {health?.status || "unknown"}
          </Badge>
        </div>
      </div>

      {/* Scenario breakdown */}
      <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-sm font-semibold mb-3">Scenario Usage</h2>
        <div className="bg-card border border-border overflow-hidden">
          {scenarios.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No scenarios yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Scenario</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Steps</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Active Sessions</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((sc) => (
                  <tr key={sc.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{sc.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant={sc.parent_scenario_id ? "warning" : "secondary"}>
                        {sc.parent_scenario_id ? "walkthrough" : "base"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                      {sc.walkthrough_steps && Array.isArray(sc.walkthrough_steps) ? sc.walkthrough_steps.length : "—"}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {scenarioUsage[sc.id] || 0}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
