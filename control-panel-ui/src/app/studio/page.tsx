"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileJson, Loader2, Play, Plus, RotateCcw, X } from "lucide-react";
import { api } from "@/lib/api";
import { RunHistory } from "./run-history";
import { RunPanel } from "./run-panel";
import { StepEditor } from "./step-editor";
import { useLiveMic } from "./use-live-mic";
import { VoiceComposer, type LogEntry } from "./voice-composer";
import { parseCommand, type Command } from "./voice-commands";
import {
  download, EMPTY_PLAN, EXAMPLES, formatActual, isActive, isAssertion, pageKeyterms, SAMPLE,
  type Draft, type PageMap, type Plan, type Run, type SavedPlan, type Target,
} from "./types";
import "./studio.css";

const FALLBACK_TARGETS: Target[] = [
  { id: "sample-broken", name: "Demo store, broken build", url: "", built_in: true },
  { id: "sample-fixed", name: "Demo store, fixed build", url: "", built_in: true },
];

function changedSteps(before: Plan, after: Plan) {
  const old = new Set(before.steps.map(step => JSON.stringify(step)));
  return new Set(after.steps.flatMap((step, i) => (old.has(JSON.stringify(step)) ? [] : [i])));
}

type Prefs = { watch: boolean; speak: boolean };

/** A sentence that makes sense heard, not read: it names the failing step and both values. */
function spokenResult(run: Run) {
  const checks = run.results.filter(r => r.action.startsWith("assert_"));
  if (run.status === "passed") return checks.length === 1 ? "Passed. The check matched." : `Passed. All ${checks.length} checks matched.`;
  const failed = run.results.find(r => r.status === "failed");
  if (run.status === "failed" && failed) {
    const actual = formatActual(failed.actual);
    return `Failed at step ${failed.index + 1}. Expected ${failed.expected}, but the page showed ${actual === "Not observed" ? "nothing" : actual}.`;
  }
  const broken = run.results.find(r => r.status === "errored");
  if (broken) return `Could not finish step ${broken.index + 1}. ${broken.reason ?? ""}`;
  return runSummary(run);
}

function runSummary(run: Run) {
  const checks = run.results.filter(r => r.action.startsWith("assert_"));
  const failed = checks.filter(r => r.status === "failed").length;
  if (run.status === "passed") return `Passed. ${checks.length === 1 ? "The check matched" : `All ${checks.length} checks matched`}.`;
  if (run.status === "failed") return `Failed. ${failed} of ${checks.length} ${checks.length === 1 ? "check" : "checks"} did not match.`;
  if (run.status === "errored") return "Could not finish. A step could not run.";
  return "Cancelled.";
}

export default function TestStudio() {
  const lastSaved = useRef<{ fingerprint: string; saved: SavedPlan } | null>(null);
  const [plan, setPlanState] = useState<Plan>(EMPTY_PLAN);
  const undoRef = useRef<Plan[]>([]);
  const [text, setText] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetId, setTargetId] = useState("sample-broken");
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [changed, setChanged] = useState<Set<number>>(new Set());
  const [unmapped, setUnmapped] = useState<number[]>([]);
  const [pageMap, setPageMap] = useState<{ data: PageMap | null; loading: boolean; error: string }>({ data: null, loading: false, error: "" });
  const [micAvailable, setMicAvailable] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ watch: false, speak: false });
  const prefsRef = useRef(prefs);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("qlabs-studio-prefs") || "{}");
      const next = { watch: stored.watch === true, speak: stored.speak === true };
      prefsRef.current = next;
      setPrefs(next);
    } catch {
      // Storage can be unavailable; defaults stay in place.
    }
  }, []);
  const [appForm, setAppForm] = useState<{ open: boolean; name: string; url: string; error: string }>({ open: false, name: "", url: "", error: "" });

  // Voice requests arrive from callbacks, so the latest state is read through refs.
  const planRef = useRef(plan);
  const targetRef = useRef(targetId);
  const targetsRef = useRef<Target[]>(FALLBACK_TARGETS);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const logId = useRef(0);
  const runLogEntry = useRef<number | null>(null);
  planRef.current = plan;
  targetRef.current = targetId;

  const shownTargets = targets.length ? targets : FALLBACK_TARGETS;
  targetsRef.current = shownTargets;
  const currentTarget = shownTargets.find(t => t.id === targetId);
  const assertions = plan.steps.filter(isAssertion).length;
  const running = isActive(run);
  const canRun = !busy && !running && assertions > 0 && plan.name.trim().length > 0;
  // Every edit saves a new immutable record, so collapse identical bodies (the API lists newest first).
  const uniquePlans = plans.filter(
    (saved, i) => plans.findIndex(other => JSON.stringify(other.body) === JSON.stringify(saved.body)) === i,
  );

  const addLog = (entry: Omit<LogEntry, "id">) => {
    const id = ++logId.current;
    setLog(current => [...current, { ...entry, id }]);
    return id;
  };
  const updateLog = (id: number, patch: Partial<LogEntry>) =>
    setLog(current => current.map(entry => (entry.id === id ? { ...entry, ...patch } : entry)));

  function setPlan(next: Plan, options: { remember?: boolean } = {}) {
    if (options.remember) undoRef.current = [...undoRef.current.slice(-19), planRef.current];
    planRef.current = next;
    setPlanState(next);
  }

  const refresh = useCallback(async () => {
    const [saved, history, available] = await Promise.all([
      api("/api/acceptance/plans"),
      api("/api/acceptance/runs"),
      api("/api/acceptance/targets"),
    ]);
    setPlans(saved);
    setRuns(history);
    setTargets(available);
    return { saved: saved as SavedPlan[], available: available as Target[] };
  }, []);

  const mic = useLiveMic(
    said => enqueue(said, "mic"),
    message => setError(message),
  );
  const { setKeyterms, mute } = mic;

  // Reads a result aloud. The mic is muted for roughly as long as the speech lasts, so it does not hear itself.
  function say(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    mute(text.length * 75 + 1500);
    utterance.onend = () => mute(700);
    window.speechSynthesis.speak(utterance);
  }

  function setPref(key: keyof Prefs, value: boolean) {
    const next = { ...prefsRef.current, [key]: value };
    prefsRef.current = next;
    setPrefs(next);
    try {
      localStorage.setItem("qlabs-studio-prefs", JSON.stringify(next));
    } catch {
      // Private windows can block storage; the toggle still works for this visit.
    }
  }

  const loadMap = useCallback(async (id: string, refreshMap = false) => {
    setPageMap(current => ({ ...current, loading: true, error: "" }));
    try {
      const data: PageMap = await api(`/api/acceptance/targets/${id}/map${refreshMap ? "?refresh=true" : ""}`);
      if (targetRef.current !== id) return;
      setPageMap({ data, loading: false, error: "" });
      setKeyterms(pageKeyterms(data));
    } catch (e) {
      if (targetRef.current !== id) return;
      setPageMap({ data: null, loading: false, error: e instanceof Error ? e.message : "Could not read the page." });
    }
  }, [setKeyterms]);

  useEffect(() => {
    refresh()
      .then(({ saved, available }) => {
        // Links from the dashboard: ?plan= opens a saved test, ?target= picks the app, ?say= fills the box.
        const params = new URLSearchParams(window.location.search);
        const target = params.get("target");
        if (target && available.some(t => t.id === target)) setTargetId(target);
        const linked = saved.find(p => p.id === params.get("plan"));
        if (linked) openSaved(linked);
        const said = params.get("say");
        if (said) setText(said.slice(0, 6000));
      })
      .catch(() => setError("Can't reach the Q Labs API on port 8000. Start it, then reload this page."));
    api("/api/voice/status").then(status => setMicAvailable(!!status.live_mic)).catch(() => {});
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps -- links are applied once, on load

  useEffect(() => {
    loadMap(targetId);
  }, [targetId, loadMap]);

  // Poll the active run until it settles, then refresh history once.
  useEffect(() => {
    if (!run || !isActive(run)) return;
    let alive = true;
    const timer = setInterval(() => {
      api(`/api/acceptance/runs/${run.id}`)
        .then((next: Run) => {
          if (!alive) return;
          setRun(next);
          if (isActive(next)) return;
          if (runLogEntry.current) {
            updateLog(runLogEntry.current, { reply: runSummary(next), tone: next.status === "passed" ? "done" : "error" });
            runLogEntry.current = null;
          }
          if (prefsRef.current.speak) say(spokenResult(next));
          refresh().catch(() => {});
        })
        .catch(() => alive && setError("Lost contact with this run. Open it from History once the API is back."));
    }, 900);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [run?.id, run?.status, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!exportOpen) return;
    const close = () => setExportOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [exportOpen]);

  // M toggles the mic, unless the person is typing somewhere.
  const { listening, connecting, start: startMic, stop: stopMic } = mic;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const field = (event.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
      if (field || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== "m" || !micAvailable) return;
      event.preventDefault();
      if (listening || connecting) stopMic();
      else startMic();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, connecting, startMic, stopMic, micAvailable]);

  // Saved tests are immutable; an unchanged test reuses its last saved record.
  async function save() {
    const fingerprint = JSON.stringify(planRef.current);
    if (lastSaved.current?.fingerprint === fingerprint) return lastSaved.current.saved;
    const saved = (await api("/api/acceptance/plans", { method: "POST", body: fingerprint })) as SavedPlan;
    lastSaved.current = { fingerprint, saved };
    return saved;
  }

  async function launch(target: string, watch = prefsRef.current.watch) {
    const saved = await save();
    const next: Run = await api("/api/acceptance/runs", {
      method: "POST",
      body: JSON.stringify({ plan_id: saved.id, target_id: target, watch }),
    });
    setRun(next);
    setSelectedStep(null);
    await refresh();
    return next;
  }

  async function act(name: string, work: () => Promise<void>) {
    setBusy(name);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Your test is unchanged.");
    } finally {
      setBusy(null);
    }
  }

  async function draft(said: string, entry: number) {
    const before = planRef.current;
    setDrafting(true);
    try {
      const result: Draft = await api("/api/acceptance/draft", {
        method: "POST",
        body: JSON.stringify({ instruction: said, target_id: targetRef.current, current: before.steps.length ? before : null }),
      });
      setPlan(result.plan, { remember: true });
      setChanged(changedSteps(before, result.plan));
      setUnmapped(result.unmapped);
      updateLog(entry, { reply: result.summary, tone: "done" });
    } catch (e) {
      updateLog(entry, { reply: e instanceof Error ? e.message : "That did not work.", tone: "error" });
    } finally {
      setDrafting(false);
    }
  }

  async function command(cmd: Command, entry: number) {
    const reply = (message: string, tone: LogEntry["tone"] = "command") => updateLog(entry, { reply: message, tone });
    const name = (id: string) => targetsRef.current.find(t => t.id === id)?.name ?? "that app";
    if (cmd.type === "target") {
      setTargetId(cmd.targetId);
      return reply(`Switched to ${name(cmd.targetId)}.`);
    }
    if (cmd.type === "undo") {
      const previous = undoRef.current[undoRef.current.length - 1];
      if (!previous) return reply("Nothing to undo.", "error");
      undoRef.current = undoRef.current.slice(0, -1);
      setPlan(previous);
      setChanged(new Set());
      setUnmapped([]);
      return reply("Undid the last change.");
    }
    if (cmd.type === "reset") {
      setPlan(EMPTY_PLAN, { remember: true });
      setChanged(new Set());
      setUnmapped([]);
      return reply("Cleared. Describe a new test.");
    }
    if (!planRef.current.steps.some(isAssertion)) return reply("Describe what should happen first, so there is something to check.", "error");
    if (cmd.type === "export") {
      const saved = await save();
      const exported = await api(`/api/acceptance/plans/${saved.id}/export`);
      download(exported.filename, exported.source);
      return reply("Downloaded the Playwright test.");
    }
    const target = cmd.targetId ?? targetRef.current;
    if (target !== targetRef.current) setTargetId(target);
    try {
      await launch(target, cmd.watch || prefsRef.current.watch);
      runLogEntry.current = entry;
      reply(`Running on ${name(target)}.`, "pending");
    } catch (e) {
      reply(e instanceof Error ? e.message : "Could not start the run.", "error");
    }
  }

  function enqueue(said: string, source: LogEntry["source"]) {
    const cmd = parseCommand(said, targetsRef.current);
    const entry = addLog({ said, source, tone: "pending" });
    queue.current = queue.current.then(() => (cmd ? command(cmd, entry) : draft(said, entry))).catch(() => {});
  }

  function submitText() {
    const said = text.trim();
    if (said.length < 6 && !parseCommand(said, shownTargets)) return;
    setText("");
    enqueue(said, "typed");
  }

  const startRun = () => act("run", async () => void (await launch(targetId)));

  const exportPlaywright = () =>
    act("export", async () => {
      const saved = await save();
      const exported = await api(`/api/acceptance/plans/${saved.id}/export`);
      download(exported.filename, exported.source);
      await refresh();
    });

  const cancelRun = () =>
    act("cancel", async () => {
      if (!run) return;
      setRun(await api(`/api/acceptance/runs/${run.id}/cancel`, { method: "POST" }));
      await refresh();
    });

  const addApp = () =>
    act("app", async () => {
      try {
        const created: Target = await api("/api/acceptance/targets", {
          method: "POST",
          body: JSON.stringify({ name: appForm.name, url: appForm.url }),
        });
        await refresh();
        setTargetId(created.id);
        setAppForm({ open: false, name: "", url: "", error: "" });
      } catch (e) {
        setAppForm(form => ({ ...form, error: e instanceof Error ? e.message : "Could not add that app." }));
      }
    });

  const removeApp = () =>
    act("app", async () => {
      await api(`/api/acceptance/targets/${targetId}`, { method: "DELETE" });
      setTargetId("sample-broken");
      await refresh();
    });

  function editPlan(next: Plan) {
    setPlan(next);
    setChanged(new Set());
  }

  function loadSample() {
    setPlan(structuredClone(SAMPLE), { remember: true });
    setChanged(new Set());
    setUnmapped([]);
    setTargetId("sample-broken");
  }

  function openSaved(saved: SavedPlan) {
    setPlan(saved.body, { remember: true });
    setChanged(new Set());
    setUnmapped([]);
    lastSaved.current = { fingerprint: JSON.stringify(saved.body), saved };
  }

  return (
    <div className="qs">
      <header className="qs-top">
        <div className="qs-title">
          <h1>Test studio</h1>
          <p>Say what should happen. Q Labs reads your page, writes the test and runs it in Chromium.</p>
        </div>
        <div className="qs-top-actions">
          <button type="button" className="qs-button" onClick={loadSample} disabled={!!busy}>
            <RotateCcw size={15} /> Load sample
          </button>
          <div className="qs-menu">
            <button
              type="button"
              className="qs-button"
              aria-expanded={exportOpen}
              aria-haspopup="menu"
              onClick={event => {
                event.stopPropagation();
                setExportOpen(open => !open);
              }}
            >
              <Download size={15} /> Export <ChevronDown size={14} />
            </button>
            {exportOpen && (
              <div className="qs-menu-list" role="menu">
                <button type="button" role="menuitem" disabled={!!busy || !assertions} onClick={exportPlaywright}>
                  <Download size={15} /> Export Playwright
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => download("test-plan.json", JSON.stringify(plan, null, 2), "application/json")}
                >
                  <FileJson size={15} /> Download JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="qs-runbar">
        <label className="qs-field qs-name">
          <span>Test name</span>
          <input value={plan.name} maxLength={120} onChange={event => editPlan({ ...plan, name: event.target.value })} />
        </label>
        <div className="qs-field qs-target">
          <label htmlFor="target-select">Target</label>
          <div className="qs-target-row">
            <select id="target-select" value={targetId} onChange={event => setTargetId(event.target.value)}>
              {shownTargets.map(target => (
                <option key={target.id} value={target.id}>{target.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="qs-button qs-square"
              aria-label="Add your app"
              title="Add an app running on this computer"
              onClick={() => setAppForm(form => ({ ...form, open: !form.open, error: "" }))}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
        <label className="qs-toggle" title="Open a visible browser and slow each step down">
          <input type="checkbox" checked={prefs.watch} onChange={event => setPref("watch", event.target.checked)} />
          <span>Show browser</span>
        </label>
        <button type="button" className="qs-button is-primary qs-run" disabled={!canRun} onClick={startRun}>
          {busy === "run" || running ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
          {running ? "Running" : "Run test"}
        </button>
      </div>

      {appForm.open ? (
        <form
          className="qs-app-form"
          onSubmit={event => {
            event.preventDefault();
            addApp();
          }}
        >
          <label className="qs-field">
            <span>App name</span>
            <input value={appForm.name} maxLength={60} placeholder="SaySketch" onChange={e => setAppForm({ ...appForm, name: e.target.value })} />
          </label>
          <label className="qs-field">
            <span>App URL</span>
            <input className="is-code" value={appForm.url} placeholder="http://localhost:3001" onChange={e => setAppForm({ ...appForm, url: e.target.value })} />
          </label>
          <button type="submit" className="qs-button" disabled={!appForm.name.trim() || !appForm.url.trim() || busy === "app"}>Add app</button>
          <button type="button" className="qs-icon-button" aria-label="Close" onClick={() => setAppForm({ open: false, name: "", url: "", error: "" })}>
            <X size={15} />
          </button>
          {appForm.error && <p className="qs-form-error">{appForm.error}</p>}
        </form>
      ) : (
        <p className="qs-hint">
          {currentTarget?.built_in === false ? (
            <>
              Testing <code>{currentTarget.url}</code>.{" "}
              <button type="button" className="qs-inline-link" onClick={removeApp} disabled={!!busy}>Remove this app</button>
            </>
          ) : targetId === "sample-broken" ? (
            "The broken build ships two bugs on purpose. Run the same test on the fixed build to compare."
          ) : (
            "The fixed build validates the email and applies promo codes."
          )}
        </p>
      )}

      {error && (
        <div role="alert" className="qs-banner is-error">
          {error}
          <button type="button" className="qs-icon-button" aria-label="Dismiss" onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}

      <VoiceComposer
        text={text}
        onText={setText}
        onSubmit={submitText}
        working={drafting}
        hasSteps={plan.steps.length > 0}
        mic={{ available: micAvailable, listening: mic.listening, connecting: mic.connecting, level: mic.level, heard: mic.heard, interim: mic.interim }}
        onToggleMic={() => (mic.listening || mic.connecting ? mic.stop() : mic.start())}
        log={log}
        pageMap={pageMap}
        onRefreshMap={() => loadMap(targetId, true)}
        examples={EXAMPLES}
        speak={prefs.speak}
        onSpeak={value => setPref("speak", value)}
      />

      <div className="qs-grid">
        <div className="qs-col">
          <StepEditor plan={plan} onChange={editPlan} changed={changed} unmapped={unmapped} />

          {uniquePlans.length > 0 && (
            <section className="qs-panel" aria-labelledby="saved-heading">
              <header className="qs-panel-head">
                <h2 id="saved-heading">Saved tests</h2>
                <span className="qs-count">{uniquePlans.length}</span>
              </header>
              <ul className="qs-saved">
                {uniquePlans.slice(0, 6).map(saved => (
                  <li key={saved.id}>
                    <button type="button" disabled={!!busy} onClick={() => openSaved(saved)}>
                      <span>{saved.name}</span>
                      <span className="qs-muted">{saved.body.steps.length} steps</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="qs-col">
          <RunPanel
            run={run}
            targets={shownTargets}
            selectedStep={selectedStep}
            onSelectStep={setSelectedStep}
            onCancel={cancelRun}
            cancelling={busy === "cancel"}
          />
          <RunHistory
            runs={runs}
            plans={plans}
            targets={shownTargets}
            currentRunId={run?.id}
            onOpen={next => {
              setRun(next);
              setSelectedStep(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
