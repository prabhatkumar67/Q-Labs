"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGraphData } from "@/components/graph/use-graph-data";
import { EntityGraph } from "@/components/graph/entity-graph";
import type { GraphNode } from "@/components/graph/graph-types";

function getNodeHref(node: GraphNode): string | null {
  switch (node.type) {
    case "app":
      return `/apps/${node.id}`;
    case "version":
      // Versions live under the app detail page
      return node.metadata.app_id ? `/apps/${node.metadata.app_id}` : null;
    case "scenario":
      return `/scenarios/${node.id}`;
    case "workflow":
      // Workflows live under the scenario page
      return node.metadata.scenario_id
        ? `/scenarios/${node.metadata.scenario_id}`
        : null;
    case "sandbox":
      return `/sandbox/${node.id}`;
    default:
      return null;
  }
}

export default function GraphPage() {
  const { nodes, edges, loading, error } = useGraphData();
  const router = useRouter();

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      const href = getNodeHref(node);
      if (href) router.push(href);
    },
    [router]
  );

  const isEmpty = !loading && !error && nodes.length === 0;

  return (
    <div className="-mx-8 -my-6 relative w-[calc(100%+4rem)] h-[calc(100vh)] graph-bg">
      {/* Title overlay */}
      <div className="absolute top-4 left-4 z-30">
        <h1 className="text-sm font-semibold text-onyx-dark tracking-wide">
          Entity Graph
        </h1>
        {!loading && !error && nodes.length > 0 && (
          <p className="text-[11px] text-onyx-dark/50 mt-0.5">
            {nodes.length} nodes · Drag to move, scroll to zoom, click to open
          </p>
        )}
      </div>

      {/* Legend */}
      {!isEmpty && !loading && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-3 text-[10px] text-onyx-dark/60">
          {(
            [
              ["App", "#3DDC91"],
              ["Version", "#2BAD72"],
              ["Scenario", "#FFCD48"],
              ["Workflow", "#60A5FA"],
              ["Sandbox", "#E54F38"],
            ] as const
          ).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span
                className="inline-block size-2.5"
                style={{ backgroundColor: color, borderRadius: "50%" }}
              />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-onyx-dark/50 animate-pulse-subtle">
            Loading entities…
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-onyx-coral">{error}</p>
            <p className="text-xs text-onyx-dark/50 mt-1">
              Make sure the API server is running
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-sm text-onyx-dark/50">No entities found</p>
            <Link
              href="/apps"
              className="text-xs text-onyx-green hover:underline mt-1 inline-block"
            >
              Create your first app →
            </Link>
          </div>
        </div>
      )}

      {/* Graph */}
      {!loading && !error && nodes.length > 0 && (
        <div className="w-full h-full">
          <EntityGraph
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
          />
        </div>
      )}
    </div>
  );
}
