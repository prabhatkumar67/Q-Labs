"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

interface SandboxNavBarProps {
  origin: string;
  sandboxReady: boolean;
  onNavigate: (fullUrl: string) => void;
  onRefresh: () => void;
  capturedStepsCount: number;
  /** Path reported by the iframe via url-changed postMessage */
  syncPath?: string;
}

export function SandboxNavBar({
  origin,
  sandboxReady,
  onNavigate,
  onRefresh,
  capturedStepsCount,
  syncPath,
}: SandboxNavBarProps) {
  const [pathInput, setPathInput] = useState("/");
  const [history, setHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync path from iframe navigation (clicks within the sandboxed app)
  useEffect(() => {
    if (!syncPath) return;
    
    // Only update if it actually changed and user isn't typing
    if (document.activeElement !== inputRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPathInput((prev) => {
        if (prev === syncPath) return prev;
        
        // If it changed, we should also update history
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory((histPrev) => {
          const truncated = histPrev.slice(0, historyIndex + 1);
          return [...truncated, syncPath];
        });
        
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistoryIndex((i) => i + 1);
        
        return syncPath;
      });
    }
  }, [syncPath, historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = useCallback(
    (path: string, pushHistory = true) => {
      const normalized = path.startsWith("/") ? path : `/${path}`;
      setPathInput(normalized);
      onNavigate(`${origin}${normalized}`);

      if (pushHistory) {
        setHistory((prev) => {
          const truncated = prev.slice(0, historyIndex + 1);
          return [...truncated, normalized];
        });
        setHistoryIndex((i) => i + 1);
      }
    },
    [origin, onNavigate, historyIndex],
  );

  const handleSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = pathInput.trim() || "/";
        navigateTo(value);
        inputRef.current?.blur();
      }
    },
    [pathInput, navigateTo],
  );

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    const path = history[newIndex];
    setHistoryIndex(newIndex);
    setPathInput(path);
    onNavigate(`${origin}${path}`);
  }, [canGoBack, historyIndex, history, origin, onNavigate]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    const path = history[newIndex];
    setHistoryIndex(newIndex);
    setPathInput(path);
    onNavigate(`${origin}${path}`);
  }, [canGoForward, historyIndex, history, origin, onNavigate]);

  // Select path text on focus for easy editing
  const handleFocus = useCallback(() => {
    setTimeout(() => inputRef.current?.select(), 0);
  }, []);

  return (
    <div className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
      {/* Navigation controls */}
      <div className="inline-flex items-center gap-0 shrink-0">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className="p-0.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
          title="Back"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={goForward}
          disabled={!canGoForward}
          className="p-0.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
          title="Forward"
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="p-0.5 hover:bg-muted transition-colors duration-150"
          title="Refresh"
        >
          <RotateCw className="size-3" />
        </button>
      </div>

      {/* URL bar — flat, inline */}
      <div className="flex items-center min-w-0 flex-1 bg-muted/50 px-2 py-0.5">
        <span className="text-muted-foreground/40 shrink-0 select-none">
          {origin}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={handleSubmit}
          onFocus={handleFocus}
          className="bg-transparent outline-none text-foreground min-w-0 flex-1"
          placeholder="/"
        />
      </div>

      {/* Recording indicator */}
      {sandboxReady && capturedStepsCount > 0 && (
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <span className="size-1.5 rounded-full bg-onyx-coral inline-block animate-pulse" />
          <span className="text-onyx-coral">REC</span>
          <span className="text-muted-foreground">{capturedStepsCount}</span>
        </span>
      )}
    </div>
  );
}
