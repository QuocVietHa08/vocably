"use client";

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { VoiceSphere, type SphereState } from "./VoiceSphere";

/* ─── Types ──────────────────────────────────────────────────────────── */

export interface CapturedWord {
  word: string;
  definition: string;
  example?: string;
  capturedAt: number;
}

export interface VoiceSessionHandle {
  disconnect: () => void;
}

interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

interface NewWordEvent extends RealtimeEvent {
  type: "new_word";
  word: string;
  definition: string;
  example?: string;
}

/* ─── System Prompt ──────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `You are an expert IELTS speaking coach and conversation partner.

CONVERSATION RULES:
1. Engage the user in natural conversation on IELTS-relevant topics (environment, technology, society, education, health, culture, work, travel, media, family, health, science).
2. Keep responses concise — 2 to 4 sentences max — to maintain natural rhythm.
3. Switch topics naturally every 3–5 exchanges.

CORRECTION RULES — very important:
- When the user makes a grammar or vocabulary mistake, correct it naturally inside your reply.
- Wrap the corrected word or phrase in *asterisks* like this: *corrected phrase*
- Example: "You could say *it is difficult* rather than 'it is difficultly'."
- Only correct the most important error per turn. Do not overwhelm the user.

VOCABULARY RULES — very important:
- When you introduce or use an advanced IELTS Band 7–9 word the user should learn, wrap it in **double asterisks** like this: **meticulous**.
- After the word give a brief parenthetical meaning, e.g. **meticulous** (paying great attention to detail).
- Limit to one or two new words per response.
- Also emit a data channel event with type "new_word", the word, a concise definition, and an example sentence so the app can save it.

FORMATTING RULE:
- Never use bullet points, headers, or markdown lists in your spoken responses — only natural prose.
- The *correction* and **vocabulary** markers are the only formatting you should use.

Start by warmly greeting the user and asking which topic they'd like to practise today.
`;

/* ─── Constants ──────────────────────────────────────────────────────── */

const LS_KEY       = "ielts_captured_words";
const AUDIO_POLL_MS = 50;

/* ─── Helpers ────────────────────────────────────────────────────────── */

function loadWords(): CapturedWord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); }
  catch { return []; }
}

function saveWord(w: CapturedWord) {
  const existing = loadWords();
  if (existing.some((e) => e.word.toLowerCase() === w.word.toLowerCase())) return;
  localStorage.setItem(LS_KEY, JSON.stringify([...existing, w]));
}

/* ─── Props ──────────────────────────────────────────────────────────── */

interface VoiceSessionProps {
  sphereState: SphereState;
  audioLevel:  number;
  onStateChange:    (s: SphereState) => void;
  onAudioLevel:     (n: number) => void;
  onWordCaptured?:  (w: CapturedWord) => void;
  onTopicChange?:   (topic: string) => void;
  /** Fired with full text when a turn completes */
  onMessage?:       (role: "user" | "assistant", text: string) => void;
  /** Fired with partial delta while AI is speaking */
  onAssistantDelta?:(delta: string) => void;
  /** Sphere canvas size in px (default 240) */
  size?: number;
}

/* ─── Component ──────────────────────────────────────────────────────── */

export const VoiceSession = forwardRef<VoiceSessionHandle, VoiceSessionProps>(
  function VoiceSession(
    {
      sphereState,
      audioLevel,
      onStateChange,
      onAudioLevel,
      onWordCaptured,
      onTopicChange,
      onMessage,
      onAssistantDelta,
      size,
    },
    ref
  ) {
    const pcRef        = useRef<RTCPeerConnection | null>(null);
    const dcRef        = useRef<RTCDataChannel | null>(null);
    const streamRef    = useRef<MediaStream | null>(null);
    const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
    const audioElRef   = useRef<HTMLAudioElement | null>(null);
    // Tracks processed item IDs so StrictMode double-invocation can't produce duplicates
    const seenItemIds  = useRef<Set<string>>(new Set());

    /* ── Audio-level polling ─────────────────────────────────────────── */
    const startAudioPoll = useCallback((analyser: AnalyserNode) => {
      const buf = new Uint8Array(analyser.frequencyBinCount);
      pollRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        onAudioLevel(Math.min(Math.sqrt(sum / buf.length) * 4, 1));
      }, AUDIO_POLL_MS);
    }, [onAudioLevel]);

    const stopAudioPoll = useCallback(() => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      onAudioLevel(0);
    }, [onAudioLevel]);

    /* ── Data-channel handler ────────────────────────────────────────── */
    const handleDataEvent = useCallback((raw: string) => {
      let evt: RealtimeEvent;
      try { evt = JSON.parse(raw); } catch { return; }

      switch (evt.type) {

        case "session.created":
          dcRef.current?.send(JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: SYSTEM_PROMPT,
              voice: "alloy",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 700,
              },
            },
          }));
          break;

        case "input_audio_buffer.speech_started":
          onStateChange("listening");
          break;

        case "response.audio.delta":
          onStateChange("speaking");
          break;

        /* ── Streaming AI transcript delta ─────────────────────────── */
        case "response.audio_transcript.delta": {
          const delta = (evt as { delta?: string }).delta ?? "";
          if (delta) onAssistantDelta?.(delta);
          // topic heuristic
          const m = delta.match(/\b(environment|technology|education|health|society|culture|travel|work|family|media)\b/i);
          if (m) onTopicChange?.(m[1]);
          break;
        }

        /* ── Complete AI message ───────────────────────────────────── */
        case "response.audio_transcript.done": {
          const transcript = (evt as { transcript?: string }).transcript ?? "";
          if (transcript) onMessage?.("assistant", transcript);
          onStateChange("listening");
          break;
        }

        /* ── Complete user message (Whisper transcription) ─────────── */
        case "conversation.item.input_audio_transcription.completed": {
          // item_id deduplication — StrictMode fires two connections briefly
          const itemId     = (evt as { item_id?: string }).item_id ?? "";
          const transcript = (evt as { transcript?: string }).transcript ?? "";
          if (transcript.trim() && itemId && !seenItemIds.current.has(itemId)) {
            seenItemIds.current.add(itemId);
            onMessage?.("user", transcript.trim());
          }
          break;
        }

        case "response.done":
          onStateChange("listening");
          break;

        /* ── New word event ─────────────────────────────────────────── */
        case "new_word": {
          const nw = evt as NewWordEvent;
          if (nw.word && nw.definition) {
            const captured: CapturedWord = {
              word: nw.word,
              definition: nw.definition,
              example: nw.example,
              capturedAt: Date.now(),
            };
            saveWord(captured);
            onWordCaptured?.(captured);
          }
          break;
        }

        default: break;
      }
    }, [onStateChange, onMessage, onAssistantDelta, onWordCaptured, onTopicChange]);

    /* ── Disconnect ──────────────────────────────────────────────────── */
    const disconnect = useCallback(() => {
      stopAudioPoll();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      dcRef.current?.close();
      dcRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      if (audioElRef.current) { audioElRef.current.srcObject = null; audioElRef.current = null; }
      onStateChange("idle");
    }, [stopAudioPoll, onStateChange]);

    /* ── Expose handle ───────────────────────────────────────────────── */
    useImperativeHandle(ref, () => ({ disconnect }), [disconnect]);

    /* ── Lifecycle ───────────────────────────────────────────────────── */
    useEffect(() => {
      // cancelled flag prevents StrictMode's first (discarded) run from
      // completing its async handshake and leaving a zombie connection alive.
      let cancelled = false;

      const run = async () => {
        onStateChange("connecting");

        // 1. Ephemeral token
        let ephemeralKey: string;
        try {
          const res  = await fetch("/api/session", { method: "POST" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Failed to get session token");
          ephemeralKey = data.client_secret?.value ?? data.client_secret;
          if (!ephemeralKey) throw new Error("Invalid session response");
        } catch (err) {
          if (!cancelled) { console.error("[VoiceSession] token error:", err); onStateChange("idle"); }
          return;
        }
        if (cancelled) return; // StrictMode cleanup already ran — bail out

        // 2. Microphone
        let mic: MediaStream;
        try {
          mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          if (!cancelled) { console.error("[VoiceSession] mic error:", err); onStateChange("idle"); }
          return;
        }
        if (cancelled) { mic.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = mic;

        // 3. Web Audio analyser
        const audioCtx = new AudioContext();
        const source   = audioCtx.createMediaStreamSource(mic);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        startAudioPoll(analyser);

        // 4. PeerConnection
        const pc      = new RTCPeerConnection();
        pcRef.current = pc;
        const audioEl     = new Audio();
        audioEl.autoplay  = true;
        audioElRef.current = audioEl;
        pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));

        // 5. Data channel
        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;
        dc.onmessage = (e) => { if (!cancelled) handleDataEvent(e.data); };

        // 6. SDP exchange
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (cancelled) { disconnect(); return; }

        const sdpRes = await fetch(
          "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${ephemeralKey}`, "Content-Type": "application/sdp" },
            body: offer.sdp,
          }
        );
        if (cancelled) { disconnect(); return; }

        if (!sdpRes.ok) {
          console.error("[VoiceSession] SDP failed:", await sdpRes.text());
          disconnect();
          return;
        }

        await pc.setRemoteDescription({ type: "answer", sdp: await sdpRes.text() });
        if (!cancelled) onStateChange("listening");
      };

      run();

      return () => {
        cancelled = true;
        seenItemIds.current.clear();
        disconnect();
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <VoiceSphere state={sphereState} audioLevel={audioLevel} size={size} />;
  }
);
