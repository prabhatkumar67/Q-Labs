"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { GraphNode } from "./graph-types";
import { ENTITY_COLORS, ENTITY_LABELS } from "./graph-types";

interface GraphDetailPanelProps {
  node: GraphNode | null;
  onClose: () => void;
}

export function GraphDetailPanel({ node, onClose }: GraphDetailPanelProps) {
  if (!node) return null;

  const color = ENTITY_COLORS[node.type];
  const typeLabel = ENTITY_LABELS[node.type];

  const links: { label: string; href: string }[] = [];
  if (node.type === "sandbox" && node.metadata.url) {
    links.push({ label: "Open Sandbox", href: node.metadata.url });
  }
  if (node.type === "app") {
    links.push({ label: "View App", href: `/apps/${node.id}` });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full w-[320px] bg-card border-l border-border shadow-lg overflow-y-auto"
        style={{ animation: "slide-in-right 0.2s ease-out both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span
              className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ backgroundColor: color + "20", color }}
            >
              {typeLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {node.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {node.id}
            </p>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            {Object.entries(node.metadata)
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {key}
                  </dt>
                  <dd className="text-xs text-foreground mt-0.5 break-all">
                    {value}
                  </dd>
                </div>
              ))}
          </div>

          {/* Links */}
          {links.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              {links.map((link) =>
                link.href.startsWith("http") ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-medium text-onyx-green hover:underline"
                  >
                    {link.label} →
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-xs font-medium text-onyx-green hover:underline"
                  >
                    {link.label} →
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
