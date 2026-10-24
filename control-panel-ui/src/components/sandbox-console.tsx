"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface LogEntry {
  timestamp: number;
  type: "capture" | "replay" | "info" | "error" | "agent";
  message: string;
}

interface SandboxConsoleProps {
  entries: LogEntry[];
  expanded: boolean;
  onToggle: () => void;
  unseenCount: number;
}

const TYPE_STYLES: Record<LogEntry["type"], string> = {
  error: "text-[#E54F38]",
  capture: "text-[#3DDC91]",
  replay: "text-[#60A5FA]",
  agent: "text-[#FFCD48]",
  info: "text-[#6B7280]",
};

export function SandboxConsole({
  entries,
  expanded,
  onToggle,
  unseenCount,
}: SandboxConsoleProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, expanded]);

  return (
    <div className="bg-[#132322]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-1.5 text-[#B7BABA] hover:text-white text-xs font-mono border-t border-[#1D3433] transition-colors"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          Console
          {unseenCount > 0 && (
            <span className="bg-[#3DDC91] text-[#132322] text-[10px] px-1.5 py-0.5 font-bold min-w-[18px] text-center">
              {unseenCount}
            </span>
          )}
        </span>
        <span className="text-[#5A6B6A]">{entries.length} entries</span>
      </button>
      {expanded && (
        <div className="h-40 overflow-y-auto bg-[#0B1215] border-t border-[#1D3433] font-mono text-xs p-3 space-y-px">
          {entries.length === 0 && (
            <p className="text-[#3A4B4A] py-4 text-center">No log entries yet</p>
          )}
          {entries.map((entry, i) => (
            <div key={i} className={`py-0.5 ${TYPE_STYLES[entry.type]}`}>
              <span className="text-[#3A4B4A]">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>{" "}
              <span className="text-[#5A6B6A]">[{entry.type}]</span>{" "}
              {entry.message}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      )}
    </div>
  );
}
