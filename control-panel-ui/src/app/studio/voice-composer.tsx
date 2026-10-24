"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ChevronDown, Loader2, Mic, MicOff, RefreshCw, ScanSearch } from "lucide-react";
import type { PageMap } from "./types";

export type LogEntry = {
  id: number;
  said: string;
  reply?: string;
  tone: "pending" | "done" | "command" | "error";
  source: "mic" | "typed";
};

type Props = {
  text: string;
  onText: (text: string) => void;
  onSubmit: () => void;
  working: boolean;
  hasSteps: boolean;
  mic: { available: boolean; listening: boolean; connecting: boolean; level: number; heard: string; interim: string };
  onToggleMic: () => void;
  log: LogEntry[];
  pageMap: { data: PageMap | null; loading: boolean; error: string };
  onRefreshMap: () => void;
  examples: string[];
};

const BARS = [0.45, 0.8, 1, 0.7, 0.4];

export function VoiceComposer({ text, onText, onSubmit, working, hasSteps, mic, onToggleMic, log, pageMap, onRefreshMap, examples }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const lastReply = log.at(-1)?.reply;

  // Keep the newest exchange in view as replies arrive.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log.length, lastReply]);
  const live = mic.listening || mic.connecting;
  const preview = [mic.heard, mic.interim].filter(Boolean).join(" ");

  let micState = mic.available ? "Mic ready" : "Type or use Wispr Flow";
  if (mic.listening) micState = "Listening";
  if (mic.connecting) micState = "Connecting";

  let micIcon = <Mic size={22} />;
  if (mic.listening) micIcon = <MicOff size={22} />;
  if (mic.connecting) micIcon = <Loader2 size={22} className="animate-spin" />;

  let mapLabel: ReactNode = "No page read yet";
  if (pageMap.data) {
    mapLabel = <span>Grounded in <strong>{pageMap.data.title || pageMap.data.url}</strong>{`, ${pageMap.data.elements.length} elements`}</span>;
  }
  if (pageMap.error) mapLabel = pageMap.error;
  if (pageMap.loading) mapLabel = "Reading the page";

  return (
    <section className="qs-panel qs-voice" aria-labelledby="voice-heading">
      <header className="qs-panel-head">
        <h2 id="voice-heading">Describe the test</h2>
        <span className={`qs-mic-state ${mic.listening ? "is-on" : ""}`}>{micState}</span>
      </header>

      <div className="qs-voice-body">
        <div className="qs-voice-input">
          <div className="qs-mic-row">
            <button
              type="button"
              className={`qs-mic ${live ? "is-live" : ""}`}
              onClick={onToggleMic}
              disabled={!mic.available}
              aria-pressed={live}
              aria-label={live ? "Stop listening" : "Start listening"}
              title={mic.available ? "Press M to toggle" : "Add Deepgram keys to the API .env to enable the mic"}
            >
              {micIcon}
            </button>
            <div className="qs-mic-copy">
              {live ? (
                <>
                  <span className="qs-level" aria-hidden="true">
                    {BARS.map((weight, i) => (
                      <span key={i} style={{ transform: `scaleY(${0.15 + Math.min(1, mic.level * 1.6) * weight})` }} />
                    ))}
                  </span>
                  <p className="qs-heard" aria-live="polite">
                    {preview ? <>{mic.heard}<span className="qs-interim"> {mic.interim}</span></> : "Go ahead, I'm listening."}
                  </p>
                </>
              ) : (
                <p className="qs-muted">
                  {mic.available ? "Click the mic or press M, then say what should happen. Pause when you're done." : "Live mic is off. Dictate into the box with Wispr Flow, or type."}
                </p>
              )}
            </div>
          </div>

          <div className="qs-compose">
            <label htmlFor="scenario-instruction" className="sr-only">What should the test do</label>
            <textarea
              id="scenario-instruction"
              value={text}
              maxLength={6000}
              rows={3}
              placeholder={hasSteps ? "Say a change, like: also check the total is $21.60" : examples[0]}
              onChange={event => onText(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
            />
            <button
              type="button"
              className="qs-send"
              disabled={working || text.trim().length < 6}
              onClick={onSubmit}
              aria-label={hasSteps ? "Apply change" : "Draft test"}
              title="Ctrl + Enter"
            >
              {working ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
            </button>
          </div>
          <p className="qs-compose-hint">Works with Wispr Flow. Commands: run it, run it on the fixed build, undo, start over, export.</p>
        </div>

        <div className="qs-log" aria-label="Conversation" ref={logRef}>
          {log.length === 0 ? (
            <div className="qs-examples">
              <span className="qs-muted">Try saying</span>
              {examples.map(example => (
                <button type="button" key={example} onClick={() => onText(example)}>&ldquo;{example}&rdquo;</button>
              ))}
            </div>
          ) : (
            <ol>
              {log.slice(-20).map(entry => (
                <li key={entry.id} className={`is-${entry.tone}`}>
                  <p className="qs-said">
                    {entry.source === "mic" && <Mic size={12} aria-label="Spoken" />} {entry.said}
                  </p>
                  <p className="qs-reply">
                    {entry.tone === "pending" ? <><Loader2 size={12} className="animate-spin" /> {entry.reply ?? "Working on it"}</> : entry.reply}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <footer className="qs-map">
        <button type="button" className="qs-map-toggle" onClick={() => setMapOpen(open => !open)} aria-expanded={mapOpen} disabled={!pageMap.data}>
          <ScanSearch size={14} />
          {mapLabel}
          {pageMap.data && <ChevronDown size={14} className={mapOpen ? "is-open" : undefined} />}
        </button>
        <button type="button" className="qs-icon-button" onClick={onRefreshMap} disabled={pageMap.loading} aria-label="Read the page again">
          <RefreshCw size={14} className={pageMap.loading ? "animate-spin" : undefined} />
        </button>
      </footer>
      {mapOpen && pageMap.data && (
        <ul className="qs-map-list">
          {pageMap.data.elements.map(element => (
            <li key={element.selector}>
              <code>{element.selector}</code>
              <span>{element.label || element.text || element.placeholder || element.tag}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
