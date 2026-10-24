"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-modal";
import {
  Pencil,
  Play,
  Square,
  Save,
  Trash2,
  Bot,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ListVideo,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { SandboxNavBar } from "@/components/sandbox-nav-bar";
import { SandboxConsole } from "@/components/sandbox-console";

interface Sandbox {
  id: string;
  scenario_id: string;
  container_id: string;
  port: number;
  sandbox_url: string;
  shareable_url?: string;
  status: string;
  created_at: string;
  name: string | null;
}

interface CapturedStep {
  index: number;
  timestamp: number;
  url: string;
  selector: string;
  fallbackSelectors: string[];
  elementTag: string;
  elementText: string;
  pageTitle: string;
  action?: "click" | "input" | "navigate";
  inputValue?: string;
  inputType?: string;
}

interface Scenario {
  id: string;
  name: string;
  walkthrough_steps: CapturedStep[] | null;
}

interface AgentAction {
  type: string;
  selector?: string;
  value?: string;
  url?: string;
  description: string;
}

interface LogEntry {
  timestamp: number;
  type: "capture" | "replay" | "info" | "error" | "agent";
  message: string;
}

interface ClickIndicator {
  x: number;
  y: number;
  width: number;
  height: number;
  key: number;
}

const LOADING_MESSAGES = [
  "Spinning up container",
  "Connecting to environment",
  "Loading application",
  "Almost ready",
];

function SandboxLoader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F9F8F6]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #C9B59C 2px, #C9B59C 3px)",
        }} />
        <div
          className="absolute top-0 left-0 right-0 h-16 bg-linear-to-b from-[#C9B59C]/10 to-transparent animate-scan-line"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="animate-fade-in-up">
          <h2 className="font-bold text-2xl tracking-[0.2em] uppercase text-foreground/80">
            Initializing
          </h2>
        </div>
        <div className="w-64 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="h-px bg-border w-full relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-foreground/60 animate-progress-fill" />
          </div>
        </div>
        <div className="h-5 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <p
            key={messageIndex}
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground animate-fade-in"
          >
            {LOADING_MESSAGES[messageIndex]}
            <span className="dot-loading">
              <span className="inline-block">.</span>
              <span className="inline-block">.</span>
              <span className="inline-block">.</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SandboxViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerId = params.id as string;
  const workflowId = searchParams.get("workflow");
  const autoAgentIntent = searchParams.get("agent");
  const qaRunIdFromUrl = searchParams.get("qa_run_id");
  const initialStartUrl = searchParams.get("startUrl") || "/";

  const { confirm } = useConfirm();
  const [sandbox, setSandbox] = useState<Sandbox | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sandboxReady, setSandboxReady] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [pollKey, setPollKey] = useState(0);

  // Inline prompt (replaces browser prompt())
  const [inlinePrompt, setInlinePrompt] = useState<{ label: string; value: string } | null>(null);
  const inlinePromptResolveRef = useRef<((v: string | null) => void) | null>(null);

  function showInlinePrompt(label: string, defaultValue: string): Promise<string | null> {
    return new Promise((resolve) => {
      inlinePromptResolveRef.current = resolve;
      setInlinePrompt({ label, value: defaultValue });
    });
  }

  function submitInlinePrompt() {
    inlinePromptResolveRef.current?.(inlinePrompt?.value ?? null);
    inlinePromptResolveRef.current = null;
    setInlinePrompt(null);
  }

  function cancelInlinePrompt() {
    inlinePromptResolveRef.current?.(null);
    inlinePromptResolveRef.current = null;
    setInlinePrompt(null);
  }

  // Nav bar state
  const [iframePath, setIframePath] = useState(initialStartUrl);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeSyncPath, setIframeSyncPath] = useState<string | undefined>();

  // Capture state
  const [capturedSteps, setCapturedSteps] = useState<CapturedStep[]>([]);
  const capturedStepsRef = useRef<CapturedStep[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Replay state
  const [walkthroughSteps, setWalkthroughSteps] = useState<CapturedStep[] | null>(null);
  const [replaying, setReplaying] = useState(false);
  const replayingRef = useRef(false);
  const [replayStep, setReplayStep] = useState(0);
  const [replayError, setReplayError] = useState<string | null>(null);
  const replayAbortRef = useRef(false);

  // Agent state
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentIntent, setAgentIntent] = useState("");
  const [agentShowInput, setAgentShowInput] = useState(false);
  const [agentPhase, setAgentPhase] = useState("");
  const [agentProgress, setAgentProgress] = useState(0);
  const [agentStepCount, setAgentStepCount] = useState(0);
  const agentAbortRef = useRef(false);
  const agentActionsRef = useRef<AgentAction[]>([]);
  const autoAgentFiredRef = useRef(false);

  // Bridge ready state — true once iframe bridge.js sends "bridge-ready"
  const [bridgeReady, setBridgeReady] = useState(false);

  // Click indicator overlay
  const [clickIndicator, setClickIndicator] = useState<ClickIndicator | null>(null);
  const indicatorKeyRef = useRef(0);

  // Console log
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logExpanded, setLogExpanded] = useState(false);
  const [unseenLogCount, setUnseenLogCount] = useState(0);
  const logExpandedRef = useRef(false);

  const addLog = useCallback((type: LogEntry["type"], msg: string) => {
    setLogEntries((prev) => [...prev, { timestamp: Date.now(), type, message: msg }]);
    if (!logExpandedRef.current) setUnseenLogCount((prev) => prev + 1);
  }, []);

  // Keep ref in sync
  useEffect(() => {
    logExpandedRef.current = logExpanded;
    if (logExpanded) setUnseenLogCount(0);
  }, [logExpanded]);

  useEffect(() => {
    api("/api/sandboxes")
      .then((sandboxes: Sandbox[]) => {
        const found = sandboxes.find((s) => s.container_id === containerId);
        setSandbox(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [containerId]);

  // Fetch walkthrough steps from workflow or parent scenario
  useEffect(() => {
    if (!sandbox) return;
    if (workflowId) {
      // Load steps from workflow
      api(`/api/workflows/${workflowId}`)
        .then((wf: { steps_json: CapturedStep[] }) => {
          if (wf.steps_json && wf.steps_json.length > 0) {
            setWalkthroughSteps(wf.steps_json);
          }
        })
        .catch(() => {});
    } else {
      api(`/api/scenarios/${sandbox.scenario_id}`)
        .then((scenario: Scenario) => {
          if (scenario.walkthrough_steps && scenario.walkthrough_steps.length > 0) {
            setWalkthroughSteps(scenario.walkthrough_steps);
          }
        })
        .catch(() => {});
    }
  }, [sandbox, workflowId]);

  // Poll for sandbox readiness
  useEffect(() => {
    if (!sandbox) return;
    setSandboxReady(false);
    setPollTimedOut(false);
    const startTime = Date.now();
    const interval = setInterval(async () => {
      try {
        await fetch(sandbox.sandbox_url, { mode: "no-cors" });
        setSandboxReady(true);
        clearInterval(interval);
      } catch {
        if (Date.now() - startTime > 30000) {
          setPollTimedOut(true);
          clearInterval(interval);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sandbox, pollKey]);

  // Listen for postMessage from iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!sandbox) return;
      if (!event.origin.startsWith("http://localhost")) return;

      const { type } = event.data || {};

      // Bridge reinitialized after full-page navigation — re-enable capture if not replaying
      if (type === "bridge-ready") {
        setBridgeReady(true);
        const path = event.data.path as string;
        // During replay, don't update iframePath — it would change the iframe src
        // and cause a second reload that races with replay commands
        if (!replayingRef.current) {
          setIframeSyncPath(path);
          setIframePath(path);
          if (iframeRef.current?.contentWindow && sandbox) {
            iframeRef.current.contentWindow.postMessage(
              { type: "start-capture" },
              new URL(sandbox.sandbox_url).origin,
            );
          }
        }
      }

      if (type === "step-captured") {
        const step = event.data.step as CapturedStep;
        capturedStepsRef.current = [...capturedStepsRef.current, step];
        setCapturedSteps(capturedStepsRef.current);
        const actionLabel = step.action === "input"
          ? `Input: "${(step.inputValue || "").slice(0, 30)}" into ${step.selector}`
          : `Click: ${step.elementTag} "${step.elementText.slice(0, 40)}" at ${step.selector}`;
        addLog("capture", actionLabel);
      }

      if (type === "url-changed") {
        // During replay, bridge handles navigation internally — don't fight it with src changes
        if (!replayingRef.current) {
          const path = event.data.path as string;
          setIframeSyncPath(path);
          setIframePath(path);
        }
      }

      if (type === "replay-click-location") {
        const key = ++indicatorKeyRef.current;
        setClickIndicator({
          x: event.data.x,
          y: event.data.y,
          width: event.data.width,
          height: event.data.height,
          key,
        });
        setTimeout(() => {
          setClickIndicator((prev) => (prev?.key === key ? null : prev));
        }, 1200);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandbox, addLog]);

  // Send start-capture once sandbox is ready
  useEffect(() => {
    if (!sandboxReady || !iframeRef.current || !sandbox) return;

    const iframe = iframeRef.current;
    const sendCapture = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "start-capture" }, new URL(sandbox.sandbox_url).origin);
        addLog("info", "Capture started");
      }
    };

    const timer = setTimeout(sendCapture, 1500);
    return () => clearTimeout(timer);
  }, [sandboxReady, sandbox, addLog]);

  // Auto-run agent when bridge is ready and ?agent= query param is present
  useEffect(() => {
    if (!bridgeReady || !autoAgentIntent || !sandbox || autoAgentFiredRef.current) return;
    autoAgentFiredRef.current = true;
    setAgentIntent(autoAgentIntent);
    // Short delay to let bridge fully settle after bridge-ready
    const timer = setTimeout(() => {
      runAgentLoop(autoAgentIntent);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeReady, autoAgentIntent, sandbox]);

  const retry = useCallback(() => setPollKey((k) => k + 1), []);

  function startRename() {
    if (!sandbox) return;
    setNameDraft(sandbox.name || `Sandbox :${sandbox.port}`);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitRename() {
    if (!sandbox) return;
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === sandbox.name) return;
    const prev = { ...sandbox };
    setSandbox((s) => (s ? { ...s, name: trimmed } : s));
    try {
      await api(`/api/sandboxes/${containerId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
    } catch {
      setSandbox(prev);
    }
  }

  async function saveState() {
    const defaultName = "Scenario - " + new Date().toISOString().slice(0, 16).replace("T", " ");
    const name = await showInlinePrompt("Save State", defaultName);
    if (name === null) return;
    setActionLoading(true);
    try {
      await api(`/api/sandboxes/${containerId}/save`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      addLog("info", "State saved: " + name);
      setMessage("State saved successfully!");
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveWorkflow() {
    if (capturedStepsRef.current.length === 0) {
      setMessage("No steps captured yet. Interact with the app first.");
      setTimeout(() => setMessage(""), 2000);
      return;
    }
    const defaultName = "Workflow - " + new Date().toISOString().slice(0, 16).replace("T", " ");
    const name = await showInlinePrompt("Save Workflow", defaultName);
    if (name === null) return;
    setActionLoading(true);
    try {
      await api(`/api/sandboxes/${containerId}/save-workflow`, {
        method: "POST",
        body: JSON.stringify({ name, steps_json: capturedStepsRef.current }),
      });
      addLog("info", "Workflow saved: " + name);
      setMessage("Workflow saved successfully!");
      setTimeout(() => setMessage(""), 2000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function destroySandbox() {
    const ok = await confirm({
      title: "Destroy Sandbox",
      description: "This sandbox will be permanently removed. This action cannot be undone.",
      confirmText: "Destroy",
      variant: "destructive",
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api(`/api/sandboxes/${containerId}`, { method: "DELETE" });
      setMessage("Sandbox destroyed. Redirecting...");
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Destroy failed");
      setActionLoading(false);
    }
  }

  // Replay logic
  async function startReplay() {
    if (!walkthroughSteps || !iframeRef.current || !sandbox) return;
    setReplaying(true);
    replayingRef.current = true;
    setReplayStep(0);
    setReplayError(null);
    replayAbortRef.current = false;
    addLog("replay", `Starting replay of ${walkthroughSteps.length} steps`);

    const targetOrigin = new URL(sandbox.sandbox_url).origin;
    iframeRef.current.contentWindow?.postMessage({ type: "stop-capture" }, targetOrigin);

    for (let i = 0; i < walkthroughSteps.length; i++) {
      if (replayAbortRef.current) break;
      flushSync(() => setReplayStep(i + 1));

      const step = walkthroughSteps[i];
      const action = step.action || "click";

      if (replayAbortRef.current) break;

      if (action === "navigate") {
        addLog("replay", `Step ${i + 1}: navigating to ${step.url}`);
        iframeRef.current!.contentWindow?.postMessage(
          { type: "navigate", url: step.url },
          targetOrigin
        );
        const msg = await waitForAnyMessage(["navigate-done", "bridge-ready"], 8000);
        if (msg) {
          await sleep(msg.type === "bridge-ready" ? 1000 : 500);
        } else if (!replayAbortRef.current) {
          await sleep(2000);
        }
        addLog("replay", `Step ${i + 1} completed`);
      } else if (action === "input") {
        addLog("replay", `Step ${i + 1}: typing "${(step.inputValue || "").slice(0, 30)}" into ${step.selector}`);
        let inputDone = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (replayAbortRef.current) break;
          iframeRef.current!.contentWindow?.postMessage(
            { type: "replay-input", selector: step.selector, fallbackSelectors: step.fallbackSelectors, value: step.inputValue, index: step.index },
            targetOrigin
          );
          const result = await waitForMessage("replay-input-done", 3000);
          if (result?.success) { inputDone = true; addLog("replay", `Step ${i + 1} completed`); break; }
          await sleep(500);
        }
        if (!inputDone && !replayAbortRef.current) {
          addLog("error", `Step ${i + 1} failed: element not found ${step.selector}`);
          flushSync(() => setReplayError(`Step ${i + 1} failed: element not found ${step.selector}`));
          const userAction = await waitForReplayDecision();
          if (userAction === "stop") { replayAbortRef.current = true; break; }
          flushSync(() => setReplayError(null));
          continue;
        }
      } else {
        addLog("replay", `Step ${i + 1}: clicking ${step.selector}`);
        let clicked = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (replayAbortRef.current) break;
          iframeRef.current!.contentWindow?.postMessage(
            { type: "replay-click", selector: step.selector, fallbackSelectors: step.fallbackSelectors, index: step.index },
            targetOrigin
          );
          const result = await waitForMessage("replay-click-done", 3000);
          if (result?.success) { clicked = true; addLog("replay", `Step ${i + 1} completed`); break; }
          await sleep(500);
        }
        if (!clicked && !replayAbortRef.current) {
          addLog("error", `Step ${i + 1} failed: element not found ${step.selector}`);
          flushSync(() => setReplayError(`Step ${i + 1} failed: element not found ${step.selector}`));
          const userAction = await waitForReplayDecision();
          if (userAction === "stop") { replayAbortRef.current = true; break; }
          flushSync(() => setReplayError(null));
          continue;
        }
        // After a click, check if it caused navigation (full reload or SPA nav)
        const navMsg = await waitForAnyMessage(["url-changed", "bridge-ready"], 2000);
        if (navMsg) {
          await sleep(navMsg.type === "bridge-ready" ? 1000 : 500);
        }
      }

      await sleep(800);
    }

    // Sync nav bar to wherever the iframe ended up, then restart capture
    const lastStep = walkthroughSteps[Math.min(replayAbortRef.current ? Math.max(0, replayStep - 1) : walkthroughSteps.length - 1, walkthroughSteps.length - 1)];
    if (lastStep) {
      setIframePath(lastStep.url);
      setIframeSyncPath(lastStep.url);
    }


    iframeRef.current?.contentWindow?.postMessage({ type: "start-capture" }, targetOrigin);
    addLog("replay", replayAbortRef.current ? "Replay stopped" : "Replay complete");
    setReplaying(false);
    replayingRef.current = false;
    setReplayStep(0);
    setReplayError(null);
  }

  function stopReplay() {
    replayAbortRef.current = true;
    replayingRef.current = false;
    setReplaying(false);
    setReplayStep(0);
    setReplayError(null);
    replayDecisionResolverRef.current = null;
  }

  function waitForMessage(type: string, timeout: number): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { window.removeEventListener("message", handler); resolve(null); }, timeout);
      function handler(event: MessageEvent) {
        if (!event.origin.startsWith("http://localhost")) return;
        if (event.data?.type === type) { clearTimeout(timer); window.removeEventListener("message", handler); resolve(event.data); }
      }
      window.addEventListener("message", handler);
    });
  }

  function waitForAnyMessage(types: string[], timeout: number): Promise<Record<string, unknown> | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", handler);
        resolve(null);
      }, timeout);

      function handler(event: MessageEvent) {
        if (!event.origin.startsWith("http://localhost")) return;
        if (types.includes(event.data?.type)) {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          resolve(event.data);
        }
      }

      window.addEventListener("message", handler);
    });
  }

  const replayDecisionResolverRef = useRef<((v: "skip" | "stop") => void) | null>(null);
  function waitForReplayDecision(): Promise<"skip" | "stop"> { return new Promise((resolve) => { replayDecisionResolverRef.current = resolve; }); }
  function skipReplayStep() { replayDecisionResolverRef.current?.("skip"); replayDecisionResolverRef.current = null; }
  function stopReplayOnError() { replayDecisionResolverRef.current?.("stop"); replayDecisionResolverRef.current = null; }

  // AI Agent logic
  async function runAgentLoop(intentOverride?: string) {
    const intent = intentOverride || agentIntent;
    if (!iframeRef.current || !sandbox || !intent.trim()) return;

    setAgentRunning(true);
    setAgentPhase("Starting...");
    setAgentProgress(0);
    setAgentStepCount(0);
    agentAbortRef.current = false;
    agentActionsRef.current = [];
    addLog("agent", `Agent started: "${intent}"`);

    const targetOrigin = new URL(sandbox.sandbox_url).origin;
    const MAX_STEPS = 30;
    iframeRef.current.contentWindow?.postMessage({ type: "stop-capture" }, targetOrigin);

    let errorContext: string | null = null;
    let consecutiveFailures = 0;
    let lastUrl = "/";
    let reportedFailure: string | null = null;

    for (let step = 0; step < MAX_STEPS; step++) {
      if (agentAbortRef.current) break;
      flushSync(() => setAgentStepCount(step + 1));

      iframeRef.current!.contentWindow?.postMessage({ type: "wait-for-stable" }, targetOrigin);
      await waitForMessage("dom-stable", 6000);
      if (agentAbortRef.current) break;

      iframeRef.current!.contentWindow?.postMessage({ type: "capture-dom" }, targetOrigin);
      const domResult = await waitForMessage("dom-captured", 5000);
      if (!domResult || agentAbortRef.current) { addLog("error", "Failed to capture DOM"); break; }
      lastUrl = domResult.url as string || lastUrl;

      addLog("agent", `Step ${step + 1}: Thinking...`);
      let response;
      try {
        response = await api("/api/agent/next-action", {
          method: "POST",
          body: JSON.stringify({
            intent,
            current_dom: domResult.html as string,
            current_url: domResult.url as string,
            current_title: domResult.title as string,
            action_history: agentActionsRef.current,
            error_context: errorContext,
          }),
        });
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        addLog("error", `AI request failed: ${errMsg}`);
        reportedFailure = `AI request failed: ${errMsg}`;
        break;
      }

      if (agentAbortRef.current) break;

      const action = response.action as AgentAction;
      flushSync(() => { setAgentPhase(response.phase as string); setAgentProgress(response.progress as number); });
      addLog("agent", `Step ${step + 1}: [${action.type}] ${action.description}`);

      if (action.type === "done") { addLog("agent", "Exploration finished. Expected behavior has not been verified."); break; }

      errorContext = null;

      if (action.type === "click" && action.selector) {
        iframeRef.current!.contentWindow?.postMessage({ type: "replay-click", selector: action.selector, fallbackSelectors: [], index: step }, targetOrigin);
        const result = await waitForMessage("replay-click-done", 5000);
        if (!result?.success) {
          errorContext = `Click failed: element not found for selector "${action.selector}"`;
          addLog("error", errorContext);
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            reportedFailure = errorContext;
            addLog("error", "Too many consecutive failures, stopping agent");
            break;
          }
          continue;
        }
        consecutiveFailures = 0;
      } else if (action.type === "type" && action.selector && action.value) {
        iframeRef.current!.contentWindow?.postMessage({ type: "replay-input", selector: action.selector, fallbackSelectors: [], value: action.value, index: step }, targetOrigin);
        const result = await waitForMessage("replay-input-done", 5000);
        if (!result?.success) {
          errorContext = `Type failed: element not found for selector "${action.selector}"`;
          addLog("error", errorContext);
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            reportedFailure = errorContext;
            addLog("error", "Too many consecutive failures, stopping agent");
            break;
          }
          continue;
        }
        consecutiveFailures = 0;
      } else if (action.type === "navigate" && action.url) {
        iframeRef.current!.contentWindow?.postMessage({ type: "navigate", url: action.url }, targetOrigin);
        await waitForMessage("navigate-done", 5000);
        await sleep(1000);
        consecutiveFailures = 0;
      } else if (action.type === "wait") {
        await sleep(1500);
        consecutiveFailures = 0;
      } else if (action.type === "extract") {
        addLog("agent", `Extracted data from ${action.selector}`);
        consecutiveFailures = 0;
      }

      agentActionsRef.current = [...agentActionsRef.current, action];
      await sleep(500);
    }

    const agentSteps: CapturedStep[] = agentActionsRef.current
      .filter((a) => a.type === "click" || a.type === "type" || a.type === "navigate")
      .map((action, index) => ({
        index, timestamp: Date.now(), url: action.url || lastUrl,
        selector: action.selector || "", fallbackSelectors: [], elementTag: "",
        elementText: action.description, pageTitle: "",
        action: action.type === "type" ? "input" as const : action.type === "navigate" ? "navigate" as const : "click" as const,
        inputValue: action.value, inputType: "text",
      }));

    if (agentSteps.length > 0) {
      capturedStepsRef.current = [...capturedStepsRef.current, ...agentSteps];
      setCapturedSteps(capturedStepsRef.current);
    }

    iframeRef.current?.contentWindow?.postMessage({ type: "start-capture" }, targetOrigin);
    addLog("agent", agentAbortRef.current ? "Agent stopped" : `Agent finished (${agentActionsRef.current.length} actions)`);

    // Report resilience-check failure to QA run when qa_run_id is in URL
    if (qaRunIdFromUrl && reportedFailure) {
      try {
        await api(`/api/qa-runs/${qaRunIdFromUrl}/results`, {
          method: "POST",
          body: JSON.stringify({
            issue_type: "resilience",
            description: reportedFailure,
            severity: "high",
          }),
        });
        await api(`/api/qa-runs/${qaRunIdFromUrl}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: "failed",
            completed_at: new Date().toISOString(),
            issues_found: 1,
          }),
        });
        addLog("info", "Failure recorded in QA report.");
        setMessage("Failure recorded in QA report.");
        setTimeout(() => setMessage(""), 4000);
      } catch (e) {
        addLog("error", `Could not report to QA run: ${e instanceof Error ? e.message : "Unknown"}`);
      }
    }

    // Auto-save workflow when triggered via ?agent= query param
    if (autoAgentIntent && !agentAbortRef.current && agentSteps.length > 0) {
      try {
        const workflowName = `Agent: ${(intentOverride || intent).slice(0, 60)}`;
        await api(`/api/sandboxes/${containerId}/save-workflow`, {
          method: "POST",
          body: JSON.stringify({ name: workflowName, steps_json: capturedStepsRef.current }),
        });
        addLog("info", `Workflow auto-saved: ${workflowName}`);
        setMessage("Workflow saved automatically!");
        setTimeout(() => setMessage(""), 3000);
      } catch (e) {
        addLog("error", `Auto-save failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    }
    setAgentRunning(false);
    setAgentPhase("");
    setAgentProgress(0);
    setAgentStepCount(0);
  }

  function stopAgent() {
    agentAbortRef.current = true;
    setAgentRunning(false);
    setAgentPhase("");
    setAgentProgress(0);
    setAgentStepCount(0);
  }

  if (loading) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-8 w-56 skeleton-block" />
        <div className="skeleton-block" style={{ height: "calc(100vh - 200px)" }} />
      </div>
    );
  }

  if (!sandbox) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-base text-muted-foreground">Sandbox not found</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col fixed inset-0 z-50 bg-background">
      {/* Header toolbar — merged with URL bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card shrink-0">
        {/* Left: back + name */}
        <Link href="/" className="shrink-0">
          <Button variant="ghost" size="icon-xs">
            <ArrowLeft className="size-3.5" />
          </Button>
        </Link>
        {editingName ? (
          <input
            ref={nameInputRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditingName(false);
            }}
            size={Math.max(nameDraft.length, 1)}
            className="text-sm font-semibold bg-transparent border-b border-onyx-green outline-none shrink-0"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-onyx-green transition-colors group shrink-0"
            onClick={startRename}
          >
            <span className="text-sm font-semibold">
              {sandbox.name || `Sandbox :${sandbox.port}`}
            </span>
            <Pencil className="size-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        )}
        <Badge variant="success" className="shrink-0">
          <span className="size-1.5 rounded-full bg-current mr-0.5" />
          {sandbox.status}
        </Badge>

        <span className="text-border shrink-0">|</span>

        {/* Center: URL bar (from SandboxNavBar) */}
        <div className="flex-1 min-w-0">
          <SandboxNavBar
            origin={new URL(sandbox.sandbox_url).origin}
            sandboxReady={sandboxReady}
            onNavigate={(fullUrl) => {
              const url = new URL(fullUrl);
              setIframePath(url.pathname);
              if (!replayingRef.current) {
                const step: CapturedStep = {
                  index: capturedStepsRef.current.length,
                  timestamp: Date.now(),
                  url: url.pathname,
                  selector: "",
                  fallbackSelectors: [],
                  elementTag: "",
                  elementText: "",
                  pageTitle: "",
                  action: "navigate",
                };
                capturedStepsRef.current = [...capturedStepsRef.current, step];
                setCapturedSteps(capturedStepsRef.current);
                addLog("capture", `Navigate: ${url.pathname}`);
              }
            }}
            onRefresh={() => {
              setIframeKey((k) => k + 1);
              if (!replayingRef.current) {
                const step: CapturedStep = {
                  index: capturedStepsRef.current.length,
                  timestamp: Date.now(),
                  url: iframePath,
                  selector: "",
                  fallbackSelectors: [],
                  elementTag: "",
                  elementText: "",
                  pageTitle: "",
                  action: "navigate",
                };
                capturedStepsRef.current = [...capturedStepsRef.current, step];
                setCapturedSteps(capturedStepsRef.current);
                addLog("capture", `Navigate (refresh): ${iframePath}`);
              }
            }}
            capturedStepsCount={capturedSteps.length}
            syncPath={iframeSyncPath}
          />
        </div>

        <span className="text-border shrink-0">|</span>

        {/* Right: action buttons */}
        <div className="flex gap-1 items-center shrink-0">
          {sandbox.shareable_url && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                navigator.clipboard.writeText(sandbox.shareable_url!);
                setMessage("Link copied — share with customer");
                setTimeout(() => setMessage(""), 2000);
              }}
              className="gap-1"
              title="Copy shareable link for customer"
            >
              <Share2 className="size-3" />
              Copy link for customer
            </Button>
          )}
          {!agentRunning && !replaying && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setAgentShowInput(!agentShowInput)}
              disabled={actionLoading}
              className="gap-1"
            >
              <Bot className="size-3" />
              Agent
            </Button>
          )}
          {agentRunning && (
            <Button variant="outline" size="xs" onClick={stopAgent} className="gap-1 text-onyx-coral">
              <Square className="size-2.5" />
              Stop
            </Button>
          )}
          {walkthroughSteps && !replaying && !agentRunning && (
            <Button variant="outline" size="xs" onClick={startReplay} disabled={actionLoading} className="gap-1">
              <Play className="size-3" />
              Replay
            </Button>
          )}
          {replaying && (
            <Button variant="outline" size="xs" onClick={stopReplay} className="gap-1 text-onyx-coral">
              <Square className="size-2.5" />
              Stop
            </Button>
          )}
          <Button variant="outline" size="xs" onClick={saveState} disabled={actionLoading || replaying || agentRunning} className="gap-1">
            <Save className="size-3" />
            Save State
          </Button>
          <Button variant="outline" size="xs" onClick={saveWorkflow} disabled={actionLoading || replaying || agentRunning || capturedSteps.length === 0} className="gap-1">
            <ListVideo className="size-3" />
            Save Workflow
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={destroySandbox}
            disabled={actionLoading || replaying || agentRunning}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Destroy"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Inline prompt */}
      {inlinePrompt && (
        <div className="bg-card border-b border-border px-4 py-2.5 shrink-0 animate-fade-in-scale">
          <form
            onSubmit={(e) => { e.preventDefault(); submitInlinePrompt(); }}
            className="flex gap-2 items-center"
          >
            <span className="text-xs font-medium text-muted-foreground shrink-0">{inlinePrompt.label}</span>
            <input
              type="text"
              value={inlinePrompt.value}
              onChange={(e) => setInlinePrompt({ ...inlinePrompt, value: e.target.value })}
              onBlur={() => setTimeout(cancelInlinePrompt, 150)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelInlinePrompt(); }}
              className="flex-1 h-8 px-3 text-sm bg-background border border-input outline-none focus:border-ring"
              autoFocus
            />
            <Button type="submit" variant="onyx" size="xs" onMouseDown={(e) => e.preventDefault()}>Save</Button>
          </form>
        </div>
      )}

      {/* Agent input */}
      {agentShowInput && !agentRunning && (
        <div className="bg-card border-b border-border px-4 py-3 shrink-0 animate-fade-in-scale">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (agentIntent.trim()) { setAgentShowInput(false); runAgentLoop(); }
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Bot className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={agentIntent}
                onChange={(e) => setAgentIntent(e.target.value)}
                placeholder="Describe what the agent should do..."
                className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-none focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
            <Button type="submit" variant="onyx" size="sm" disabled={!agentIntent.trim()}>
              Run Agent
            </Button>
          </form>
        </div>
      )}

      {/* Agent progress */}
      {agentRunning && (
        <div className="bg-card border-b border-border px-4 py-3 shrink-0 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-none bg-onyx-green/10 flex items-center justify-center">
                <Bot className="size-4 text-onyx-green" style={{ animation: "spin-slow 2s linear infinite" }} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Step {agentStepCount} {agentPhase && <span className="text-muted-foreground font-normal">— {agentPhase}</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{agentIntent}</p>
              </div>
            </div>
            <div className="w-32 h-1.5 bg-border overflow-hidden">
              <div className="h-full bg-onyx-green transition-all duration-300" style={{ width: `${Math.max(agentProgress * 100, 5)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Replay progress */}
      {replaying && (
        <div className="bg-card border-b border-border px-4 py-3 shrink-0 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Replaying step {replayStep} / {walkthroughSteps!.length}
            </p>
            <div className="w-32 h-1.5 bg-border overflow-hidden">
              <div className="h-full bg-onyx-green transition-all duration-300" style={{ width: `${(replayStep / walkthroughSteps!.length) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Replay error */}
      {replayError && (
        <div className="bg-onyx-coral/5 border-b border-onyx-coral/20 px-4 py-3 shrink-0 animate-fade-in-scale">
          <div className="flex items-center justify-between">
            <p className="text-sm text-onyx-coral">{replayError}</p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="xs" onClick={skipReplayStep}>Skip</Button>
              <Button variant="destructive" size="xs" onClick={stopReplayOnError}>Stop</Button>
            </div>
          </div>
        </div>
      )}

      {/* Status message */}
      {message && (
        <div className="bg-card border-b border-border px-4 py-3 shrink-0 animate-fade-in">
          <p className="text-sm">{message}</p>
        </div>
      )}

      {/* Iframe container */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Iframe */}
        <div className="relative flex-1 min-h-0">
          {!sandboxReady && !pollTimedOut && <SandboxLoader />}

          {pollTimedOut && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background animate-fade-in gap-4">
              <p className="text-sm text-muted-foreground">Taking longer than expected</p>
              <Button variant="onyx" size="sm" onClick={retry}>Retry Connection</Button>
            </div>
          )}

          {/* Click indicator overlay */}
          {clickIndicator && (
            <div
              key={clickIndicator.key}
              className="absolute pointer-events-none z-10"
              style={{ left: clickIndicator.x - 20, top: clickIndicator.y - 20, width: 40, height: 40 }}
            >
              <div className="absolute inset-0 rounded-full border-2 border-onyx-green" style={{ animation: "click-ripple 0.8s ease-out forwards" }} />
              <div className="absolute rounded-full bg-onyx-green" style={{ width: 8, height: 8, left: 16, top: 16, animation: "click-dot 0.8s ease-out forwards" }} />
            </div>
          )}

          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={sandboxReady ? `${new URL(sandbox.sandbox_url).origin}${iframePath}` : "about:blank"}
            className="w-full h-full border-0 transition-opacity duration-500 ease-out"
            style={{ opacity: sandboxReady ? 1 : 0 }}
            title="Sandbox"
          />
        </div>
      </div>

      {/* Console log panel */}
      <div className="shrink-0">
        <SandboxConsole
          entries={logEntries}
          expanded={logExpanded}
          onToggle={() => setLogExpanded(!logExpanded)}
          unseenCount={unseenLogCount}
        />
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
