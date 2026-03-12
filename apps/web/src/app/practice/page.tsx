"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceSession, type CapturedWord, type VoiceSessionHandle } from "@/components/voice/VoiceSession";
import type { SphereState } from "@/components/voice/VoiceSphere";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface Message {
  id:        string;
  role:      "user" | "assistant";
  text:      string;
  streaming: boolean;
}

/* ─── Text parser ────────────────────────────────────────────────────── */
// **word** → new vocabulary chip (orange)
// *word*   → grammar correction (orange italic underline)

type Segment =
  | { kind: "text";        content: string }
  | { kind: "vocab";       content: string }   // **…**
  | { kind: "correction";  content: string };  // *…*

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Match **vocab** first, then *correction*, then plain text
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ kind: "text", content: text.slice(last, m.index) });
    if (m[1] !== undefined) segments.push({ kind: "vocab",      content: m[1] });
    if (m[2] !== undefined) segments.push({ kind: "correction", content: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: "text", content: text.slice(last) });
  return segments;
}

function RichText({ text }: { text: string }) {
  const segs = parseSegments(text);
  return (
    <>
      {segs.map((seg, i) => {
        if (seg.kind === "text")       return <span key={i}>{seg.content}</span>;
        if (seg.kind === "vocab")      return (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            background: "rgba(244,81,30,0.14)",
            color: "#f4511e",
            borderRadius: 4,
            padding: "0 5px",
            fontWeight: 600,
            margin: "0 1px",
          }}>{seg.content}</span>
        );
        // correction
        return (
          <span key={i} style={{
            color: "#f4511e",
            fontStyle: "italic",
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            textUnderlineOffset: 3,
            margin: "0 1px",
          }}>{seg.content}</span>
        );
      })}
    </>
  );
}

/* ─── Status labels ──────────────────────────────────────────────────── */

const STATUS: Record<SphereState, string> = {
  idle:       "Initialising…",
  connecting: "Connecting…",
  listening:  "Listening",
  speaking:   "Speaking",
};

/* ─── Bubble ─────────────────────────────────────────────────────────── */

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 14,
      }}
    >
      {/* Role label */}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 4,
        paddingLeft: isUser ? 0 : 2,
      }}>
        {isUser ? "You" : "Coach"}
      </span>

      <div style={{
        maxWidth: "82%",
        background:   isUser ? "var(--fg)" : "var(--surface)",
        color:        isUser ? "var(--bg)" : "var(--fg)",
        border:       isUser ? "none" : "1px solid var(--border)",
        borderRadius: isUser ? "16px 16px 3px 16px" : "16px 16px 16px 3px",
        padding:      "10px 14px",
        fontSize:     14,
        lineHeight:   1.6,
      }}>
        {isUser
          ? <span>{message.text}</span>
          : <RichText text={message.text} />
        }
        {message.streaming && (
          <span style={{ marginLeft: 3, opacity: 0.4, fontSize: 12 }}>▌</span>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Word toast ─────────────────────────────────────────────────────── */

function WordToast({ word, definition }: { word: string; definition: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "9px 14px",
        minWidth: 200,
        maxWidth: 300,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f4511e", flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--fg)" }}>{word}</span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>saved</span>
      </div>
      <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, lineHeight: 1.5, whiteSpace: "normal" }}>
        {definition}
      </p>
    </motion.div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function PracticePage() {
  const router       = useRouter();
  const sessionRef   = useRef<VoiceSessionHandle>(null);
  const scrollRef    = useRef<HTMLDivElement>(null);

  const [sphereState, setSphereState] = useState<SphereState>("idle");
  const [audioLevel,  setAudioLevel]  = useState(0);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [topic,       setTopic]       = useState<string | null>(null);
  const [wordCount,   setWordCount]   = useState(0);
  const [toast,       setToast]       = useState<CapturedWord | null>(null);
  const [stopped,     setStopped]     = useState(false);

  /* ── Auto-scroll ──────────────────────────────────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* ── Streaming AI delta ───────────────────────────────────────────── */
  const handleAssistantDelta = useCallback((delta: string) => {
    setMessages((prev) => {
      // Scan backwards — the streaming bubble may not be the last message
      // if the user spoke before the AI finished its previous turn.
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === "assistant" && prev[i].streaming) {
          const updated = [...prev];
          updated[i] = { ...updated[i], text: updated[i].text + delta };
          return updated;
        }
      }
      // No streaming bubble found — start a new one
      return [...prev, { id: `ai-${Date.now()}`, role: "assistant", text: delta, streaming: true }];
    });
  }, []);

  /* ── Complete message ─────────────────────────────────────────────── */
  const handleMessage = useCallback((role: "user" | "assistant", text: string) => {
    setMessages((prev) => {
      if (role === "assistant") {
        // Find the streaming bubble (may not be last if user interrupted)
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === "assistant" && prev[i].streaming) {
            const updated = [...prev];
            updated[i] = { ...updated[i], text, streaming: false };
            return updated;
          }
        }
        return [...prev, { id: `ai-${Date.now()}`, role: "assistant", text, streaming: false }];
      }
      return [...prev, { id: `u-${Date.now()}`, role: "user", text, streaming: false }];
    });
  }, []);

  /* ── Word captured ────────────────────────────────────────────────── */
  const handleWordCaptured = useCallback((w: CapturedWord) => {
    setWordCount((n) => n + 1);
    setToast(w);
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Stop ─────────────────────────────────────────────────────────── */
  const handleStop = useCallback(() => {
    sessionRef.current?.disconnect();
    setStopped(true);
  }, []);

  const isActive = sphereState === "listening" || sphereState === "speaking";

  /* ── Elapsed-seconds counter while connecting ─────────────────────── */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (sphereState !== "connecting") { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [sphereState]);

  /* ─── Bottom bar height constant (for scroll padding) ───────────────── */
  const BOTTOM_H = 130;

  return (
    <div style={{
      background:    "var(--bg)",
      color:         "var(--fg)",
      height:        "100dvh",
      maxWidth:      480,
      margin:        "0 auto",
      display:       "flex",
      flexDirection: "column",
      overflow:      "hidden",
      position:      "relative",
    }}>

      {/* ══ Header ══ */}
      <div style={{
        flexShrink:   0,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        padding:      "44px 20px 12px",
        borderBottom: "1px solid var(--border)",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted)", fontSize: 13, padding: "4px 0",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AnimatePresence>
            {topic && (
              <motion.span
                key={topic}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--muted)" }}
              >
                {topic}
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {wordCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 20, padding: "3px 10px", fontSize: 11,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f4511e" }} />
                <span style={{ color: "var(--muted)" }}>{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ Scrollable conversation ══ */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{
          flex:       1,
          overflowY:  "auto",
          padding:    `16px 20px`,
          paddingBottom: BOTTOM_H + 16,
          display:    "flex",
          flexDirection: "column",
        }}
      >
        {messages.length === 0 && (
          <AnimatePresence mode="wait">
            {sphereState === "connecting" ? (
              /* ── Connecting state ── */
              <motion.div
                key="connecting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 28,
                }}
              >
                {/* Animated dots */}
                <div style={{ display: "flex", gap: 9 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ y: [0, -9, 0], opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                      style={{
                        display: "block", width: 8, height: 8,
                        borderRadius: "50%", background: "#f4511e",
                      }}
                    />
                  ))}
                </div>

                {/* Friendly rotating message */}
                <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={Math.min(elapsed, 3)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)" }}
                    >
                      {[
                        "Getting your coach ready…",
                        "Warming up the microphone…",
                        "Almost there…",
                        "Your coach is ready!",
                      ][Math.min(elapsed, 3)]}
                    </motion.span>
                  </AnimatePresence>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>
                    This usually takes a few seconds
                  </span>
                </div>

                {/* Soft progress bar */}
                <div style={{
                  width: 180, height: 3, borderRadius: 99,
                  background: "var(--subtle)", overflow: "hidden",
                }}>
                  <motion.div
                    animate={{ width: `${Math.min((elapsed / 5) * 100, 92)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 99, background: "#f4511e" }}
                  />
                </div>

                {/* Tip */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  style={{
                    fontSize: 12, color: "var(--muted)", textAlign: "center",
                    maxWidth: 240, lineHeight: 1.6, margin: 0,
                  }}
                >
                  💡 Speak naturally — your coach will follow your pace and correct mistakes gently.
                </motion.p>
              </motion.div>
            ) : (
              /* ── Idle / ready state ── */
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  color: "var(--muted)", fontSize: 13, textAlign: "center",
                  gap: 10, padding: "0 32px",
                }}
              >
                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.3 }}>
                  <path strokeLinecap="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"/>
                </svg>
                <span>Your conversation will appear here.</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>
                  Orange = new vocabulary · Italic underline = correction
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {messages.map((msg) => <Bubble key={msg.id} message={msg} />)}
      </div>

      {/* ══ Floating bottom bar ══ */}
      <div style={{
        position:   "absolute",
        bottom:     0, left: 0, right: 0,
        height:     BOTTOM_H,
        display:    "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding:    "0 24px 20px",
        background: "linear-gradient(to bottom, transparent 0%, var(--bg) 35%)",
      }}>

        {/* Status label (left) */}
        <AnimatePresence mode="wait">
          <motion.p
            key={stopped ? "stopped" : sphereState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{
              margin: 0, fontSize: 12, width: 80,
              color: isActive && !stopped ? "var(--fg)" : "var(--muted)",
              fontWeight: isActive && !stopped ? 500 : 400,
            }}
          >
            {stopped ? "Ended" : STATUS[sphereState]}
          </motion.p>
        </AnimatePresence>

        {/* Sphere (centre) — with word toast anchored above it */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <AnimatePresence>
            {toast && <WordToast key={toast.capturedAt} word={toast.word} definition={toast.definition} />}
          </AnimatePresence>

          {!stopped ? (
            <VoiceSession
              ref={sessionRef}
              sphereState={sphereState}
              audioLevel={audioLevel}
              onStateChange={setSphereState}
              onAudioLevel={setAudioLevel}
              onWordCaptured={handleWordCaptured}
              onTopicChange={setTopic}
              onMessage={handleMessage}
              onAssistantDelta={handleAssistantDelta}
              size={80}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "var(--subtle)", border: "1px solid var(--border)",
            }} />
          )}
        </div>

        {/* Stop / Back button (right) */}
        <div style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
          {!stopped ? (
            <button
              onClick={handleStop}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "none", border: "1px solid var(--border)",
                borderRadius: 20, padding: "7px 14px",
                cursor: "pointer", fontSize: 12, color: "var(--muted)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#e03d1a";
                e.currentTarget.style.color = "#e03d1a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: "currentColor" }} />
              Stop
            </button>
          ) : (
            <button
              onClick={() => router.back()}
              style={{
                background: "#f4511e", color: "#fff",
                border: "none", borderRadius: 20,
                padding: "7px 14px",
                cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
