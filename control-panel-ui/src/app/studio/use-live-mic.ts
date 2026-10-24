"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "./types";

const SETTLE_MS = 1500; // extra wait when a pause lands mid sentence

/**
 * Streams the mic to Deepgram and hands back one finished request at a time.
 * A request ends at a pause after a full sentence, or after a longer pause otherwise.
 */
export function useLiveMic(onRequest: (text: string) => void, onError: (message: string) => void) {
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [heard, setHeard] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);

  const session = useRef(0);
  const socket = useRef<WebSocket | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buffer = useRef("");
  const keyterms = useRef<string[]>([]);
  const mutedUntil = useRef(0);
  const onRequestRef = useRef(onRequest);
  const onErrorRef = useRef(onError);
  onRequestRef.current = onRequest;
  onErrorRef.current = onError;

  const flush = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    const text = buffer.current.trim();
    buffer.current = "";
    setHeard("");
    if (text) onRequestRef.current(text);
  }, []);

  const teardown = useCallback(() => {
    if (settle.current) clearTimeout(settle.current);
    cancelAnimationFrame(frame.current);
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recorder.current = null;
    socket.current?.close();
    socket.current = null;
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    audio.current?.close().catch(() => {});
    audio.current = null;
    setListening(false);
    setConnecting(false);
    setInterim("");
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    teardown();
    const id = ++session.current;
    buffer.current = "";
    setHeard("");
    setConnecting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (id !== session.current) return media.getTracks().forEach(track => track.stop());
      stream.current = media;
      // Ask for the short lived key only after permission, so it cannot expire inside the browser prompt.
      const response = await fetch(`${API_URL}/api/voice/token`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.key !== "string") throw new Error(body.detail || "The speech service is not available.");
      if (id !== session.current) return;

      const context = new AudioContext();
      audio.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(media).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const meter = () => {
        analyser.getByteTimeDomainData(samples);
        let peak = 0;
        for (const value of samples) peak = Math.max(peak, Math.abs(value - 128));
        setLevel(Math.min(1, peak / 64));
        frame.current = requestAnimationFrame(meter);
      };
      meter();

      const params = new URLSearchParams({
        model: "nova-3",
        interim_results: "true",
        smart_format: "true",
        utterance_end_ms: "1200",
        endpointing: "300",
      });
      keyterms.current.forEach(term => params.append("keyterm", term));
      const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", body.key]);
      socket.current = ws;

      ws.onopen = () => {
        if (id !== session.current) return ws.close();
        const rec = new MediaRecorder(media);
        recorder.current = rec;
        rec.ondataavailable = event => {
          if (ws.readyState === WebSocket.OPEN && event.data.size > 0) ws.send(event.data);
        };
        rec.start(250);
        setConnecting(false);
        setListening(true);
      };

      ws.onmessage = event => {
        if (id !== session.current) return;
        const data = JSON.parse(event.data);
        // While Q Labs is speaking, the mic hears it too. Drop that audio instead of treating it as a request.
        if (Date.now() < mutedUntil.current) {
          buffer.current = "";
          setHeard("");
          setInterim("");
          return;
        }
        if (data.type === "UtteranceEnd") {
          if (/[.?!]["']?$/.test(buffer.current.trim())) flush();
          else if (buffer.current.trim()) {
            if (settle.current) clearTimeout(settle.current);
            settle.current = setTimeout(flush, SETTLE_MS);
          }
          return;
        }
        const transcript: string | undefined = data.channel?.alternatives?.[0]?.transcript;
        if (!transcript) return;
        if (settle.current) clearTimeout(settle.current);
        if (data.is_final) {
          buffer.current = `${buffer.current} ${transcript}`.trim();
          setHeard(buffer.current);
          setInterim("");
        } else {
          setInterim(transcript);
        }
      };

      ws.onclose = event => {
        if (id !== session.current) return;
        if (event.code !== 1000 && event.code !== 1005) onErrorRef.current("The mic connection dropped. Click the mic to reconnect.");
        flush();
        session.current++;
        teardown();
      };
    } catch (error) {
      if (id !== session.current) return;
      teardown();
      const denied = error instanceof DOMException && error.name === "NotAllowedError";
      onErrorRef.current(denied ? "Microphone access is blocked. Allow it in the browser address bar." : error instanceof Error ? error.message : "Could not start the mic.");
    }
  }, [flush, teardown]);

  const stop = useCallback(() => {
    const ws = socket.current;
    const rec = recorder.current;
    const id = session.current;
    const finish = () => {
      if (id !== session.current) return;
      flush();
      session.current++;
      teardown();
    };
    // Send the last audio, ask Deepgram to finalize, then close; give up after a moment either way.
    setTimeout(finish, 1800);
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "CloseStream" }));
      rec.stop();
    } else finish();
  }, [flush, teardown]);

  const setKeyterms = useCallback((terms: string[]) => {
    keyterms.current = terms;
  }, []);

  /** Ignore what the mic hears for the next `ms` milliseconds. */
  const mute = useCallback((ms: number) => {
    mutedUntil.current = Math.max(mutedUntil.current, Date.now() + ms);
    if (settle.current) clearTimeout(settle.current);
    buffer.current = "";
    setHeard("");
  }, []);

  useEffect(() => () => {
    session.current++;
    teardown();
  }, [teardown]);

  return { listening, connecting, heard, interim, level, start, stop, setKeyterms, mute };
}
