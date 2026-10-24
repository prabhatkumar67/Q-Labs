"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import { drag } from "d3-drag";
import type { GraphNode, GraphEdge } from "./graph-types";
import { ENTITY_COLORS, ENTITY_RADII } from "./graph-types";

interface EntityGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
}

type SimNode = GraphNode & SimulationNodeDatum;
type SimLink = SimulationLinkDatum<SimNode> & { type: string };

export function EntityGraph({ nodes, edges, onNodeClick }: EntityGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation<SimNode>> | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const getConnected = useCallback(
    (nodeId: string) => {
      const connected = new Set<string>([nodeId]);
      for (const e of edges) {
        const src = typeof e.source === "string" ? e.source : (e.source as SimNode).id;
        const tgt = typeof e.target === "string" ? e.target : (e.target as SimNode).id;
        if (src === nodeId) connected.add(tgt);
        if (tgt === nodeId) connected.add(src);
      }
      return connected;
    },
    [edges]
  );

  // Resize observer
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const parent = svg.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });
    // ResizeObserver delivers the initial measured size after observing.
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // D3 simulation
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || nodes.length === 0) return;

    const { width, height } = dimensions;

    const simNodes: SimNode[] = nodes.map((n) => {
      const existing = simulationRef.current
        ?.nodes()
        .find((sn) => sn.id === n.id);
      return {
        ...n,
        x: existing?.x ?? n.x ?? width / 2 + (Math.random() - 0.5) * 300,
        y: existing?.y ?? n.y ?? height / 2 + (Math.random() - 0.5) * 300,
        fx: existing?.fx ?? null,
        fy: existing?.fy ?? null,
      };
    });

    const simLinks: SimLink[] = edges.map((e) => ({
      source: typeof e.source === "string" ? e.source : e.source.id,
      target: typeof e.target === "string" ? e.target : e.target.id,
      type: e.type,
    })) as SimLink[];

    simulationRef.current?.stop();

    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(180)
      )
      .force("charge", forceManyBody<SimNode>().strength(-700))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<SimNode>().radius((d) => ENTITY_RADII[d.type] + 8)
      );

    simulationRef.current = simulation;

    const svgSel = select(svg);
    svgSel.selectAll("g.graph-content").remove();

    // Add SVG defs for glow filters
    svgSel.selectAll("defs").remove();
    const defs = svgSel.append("defs");

    // Create a glow filter per entity type
    for (const [type, color] of Object.entries(ENTITY_COLORS)) {
      const filter = defs
        .append("filter")
        .attr("id", `glow-${type}`)
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
      filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "4")
        .attr("result", "blur");
      filter
        .append("feFlood")
        .attr("flood-color", color)
        .attr("flood-opacity", "0.3")
        .attr("result", "color");
      filter
        .append("feComposite")
        .attr("in", "color")
        .attr("in2", "blur")
        .attr("operator", "in")
        .attr("result", "glow");
      const merge = filter.append("feMerge");
      merge.append("feMergeNode").attr("in", "glow");
      merge.append("feMergeNode").attr("in", "SourceGraphic");
    }

    // Sandbox pulse glow (stronger)
    const pulseFilter = defs
      .append("filter")
      .attr("id", "glow-sandbox-pulse")
      .attr("x", "-80%")
      .attr("y", "-80%")
      .attr("width", "260%")
      .attr("height", "260%");
    pulseFilter
      .append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "blur");
    pulseFilter
      .append("feFlood")
      .attr("flood-color", ENTITY_COLORS.sandbox)
      .attr("flood-opacity", "0.5")
      .attr("result", "color");
    pulseFilter
      .append("feComposite")
      .attr("in", "color")
      .attr("in2", "blur")
      .attr("operator", "in")
      .attr("result", "glow");
    const pulseMerge = pulseFilter.append("feMerge");
    pulseMerge.append("feMergeNode").attr("in", "glow");
    pulseMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const container = svgSel.append("g").attr("class", "graph-content");

    // Edges — use onyx-green tinted lines
    const linkGroup = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#3DDC91")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);

    // Node groups
    const nodeGroup = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "grab")
      .on("click", (_event, d) => {
        onNodeClick?.(d);
      })
      .on("mouseenter", (_event, d) => {
        setHoveredId(d.id);
      })
      .on("mouseleave", () => {
        setHoveredId(null);
      });

    // Outer glow ring (subtle)
    nodeGroup
      .append("circle")
      .attr("r", (d) => ENTITY_RADII[d.type] + 4)
      .attr("fill", "none")
      .attr("stroke", (d) => ENTITY_COLORS[d.type])
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.15);

    // Main node circle
    nodeGroup
      .append("circle")
      .attr("r", (d) => ENTITY_RADII[d.type])
      .attr("fill", (d) => ENTITY_COLORS[d.type])
      .attr("fill-opacity", 0.9)
      .attr("stroke", (d) => ENTITY_COLORS[d.type])
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.4)
      .attr("filter", (d) => `url(#glow-${d.type})`);

    // Inner highlight (gives a glossy feel)
    nodeGroup
      .append("circle")
      .attr("r", (d) => ENTITY_RADII[d.type] * 0.55)
      .attr("fill", "white")
      .attr("fill-opacity", 0.08)
      .attr("pointer-events", "none");

    // Sandbox pulse rings
    nodeGroup
      .filter((d) => d.type === "sandbox" && d.metadata.status === "running")
      .append("circle")
      .attr("r", (d) => ENTITY_RADII[d.type])
      .attr("fill", "none")
      .attr("stroke", ENTITY_COLORS.sandbox)
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow-sandbox-pulse)")
      .attr("class", "node-pulse");

    // Labels
    nodeGroup
      .append("text")
      .text((d) => (d.label.length > 18 ? d.label.slice(0, 16) + "…" : d.label))
      .attr("text-anchor", "middle")
      .attr("dy", (d) => ENTITY_RADII[d.type] + 16)
      .attr("fill", "rgba(19,35,34,0.55)")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .attr("class", "graph-label");

    // Type labels inside larger nodes
    nodeGroup
      .filter((d) => ENTITY_RADII[d.type] >= 18)
      .append("text")
      .text((d) => {
        const map: Record<string, string> = {
          app: "APP",
          version: "VER",
          scenario: "SCN",
          sandbox: "SBX",
        };
        return map[d.type] || "";
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", (d) => d.type === "scenario" ? "#132322" : "white")
      .attr("fill-opacity", 0.7)
      .attr("font-size", (d) => `${Math.max(8, ENTITY_RADII[d.type] * 0.4)}px`)
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.05em")
      .attr("pointer-events", "none");

    // Drag behavior
    const dragBehavior = drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        select(event.sourceEvent.target.closest("g")).attr("cursor", "grabbing");
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        select(event.sourceEvent.target.closest("g")).attr("cursor", "grab");
      });

    nodeGroup.call(dragBehavior as never);

    // Zoom behavior
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
        const k = event.transform.k;
        container.selectAll(".graph-label").attr("opacity", k < 0.4 ? 0 : Math.min(1, (k - 0.4) * 2.5));
      });

    svgSel.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity);

    // Tick
    simulation.on("tick", () => {
      linkGroup
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);

      nodeGroup.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, dimensions, onNodeClick]);

  // Hover highlighting
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgSel = select(svg);

    if (!hoveredId) {
      svgSel.selectAll("g.nodes g").attr("opacity", 1);
      svgSel
        .selectAll("g.links line")
        .attr("stroke-opacity", 0.15)
        .attr("stroke-width", 1)
        .attr("stroke", "#3DDC91");
      return;
    }

    const connected = getConnected(hoveredId);

    svgSel.selectAll("g.nodes g").attr("opacity", (d) => {
      const node = d as SimNode;
      return connected.has(node.id) ? 1 : 0.12;
    });

    svgSel
      .selectAll("g.links line")
      .attr("stroke-opacity", (d) => {
        const link = d as SimLink;
        const src = (link.source as SimNode).id;
        const tgt = (link.target as SimNode).id;
        return src === hoveredId || tgt === hoveredId ? 0.7 : 0.04;
      })
      .attr("stroke-width", (d) => {
        const link = d as SimLink;
        const src = (link.source as SimNode).id;
        const tgt = (link.target as SimNode).id;
        return src === hoveredId || tgt === hoveredId ? 2 : 1;
      })
      .attr("stroke", (d) => {
        const link = d as SimLink;
        const src = (link.source as SimNode).id;
        const tgt = (link.target as SimNode).id;
        return src === hoveredId || tgt === hoveredId ? "#3DDC91" : "#3DDC91";
      });
  }, [hoveredId, getConnected]);

  return (
    <svg
      ref={svgRef}
      width={dimensions.width}
      height={dimensions.height}
      className="w-full h-full"
    />
  );
}
