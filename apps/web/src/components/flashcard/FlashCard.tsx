"use client";

import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Volume2 } from "lucide-react";
import { type Flashcard } from "@/data/flashcards";

interface FlashCardProps {
  card: Flashcard;
  onKnow: () => void;
  onDontKnow: () => void;
}

const SWIPE_THRESHOLD   = 100; // px before it counts as a swipe
const SWIPE_VELOCITY    = 500; // px/s fast flick also counts
const FLY_OUT_DISTANCE  = 600; // px card flies off screen

export function FlashCard({ card, onKnow, onDontKnow }: FlashCardProps) {
  const [flipped, setFlipped]     = useState(false);
  const dragStartX                = useRef(0);
  const isDragging                = useRef(false);

  // Motion values for drag
  const x        = useMotionValue(0);
  const rotate   = useTransform(x, [-250, 250], [-18, 18]);
  // Label opacity: left label fades in on left-drag, right label on right-drag
  const knowOpacity    = useTransform(x, [20, 120], [0, 1]);
  const dontKnowOpacity = useTransform(x, [-120, -20], [1, 0]);

  const speak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(card.word);
    u.lang = "en-GB"; u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const flyOut = async (direction: "left" | "right") => {
    await animate(x, direction === "right" ? FLY_OUT_DISTANCE : -FLY_OUT_DISTANCE, {
      type: "tween",
      duration: 0.3,
      ease: "easeOut",
    });
    if (direction === "right") onKnow();
    else onDontKnow();
  };

  const handleDragStart = () => {
    dragStartX.current = x.get();
    isDragging.current = false;
  };

  const handleDrag = (_: unknown, info: { offset: { x: number } }) => {
    if (Math.abs(info.offset.x) > 6) isDragging.current = true;
  };

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const offset   = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY) {
      flyOut("right");
    } else if (offset < -SWIPE_THRESHOLD || velocity < -SWIPE_VELOCITY) {
      flyOut("left");
    } else {
      // Snap back
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  const handleClick = () => {
    if (!isDragging.current) setFlipped((p) => !p);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Swipe hint labels ── */}
      <div style={{ position: "relative", height: 420 }}>

        {/* "Still learning" ghost — visible on left drag */}
        <motion.div
          style={{
            position: "absolute", inset: 0, borderRadius: 24,
            border: "2px solid var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: dontKnowOpacity, pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.05em" }}>
            Still learning
          </span>
        </motion.div>

        {/* "Got it" ghost — visible on right drag */}
        <motion.div
          style={{
            position: "absolute", inset: 0, borderRadius: 24,
            border: "2px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: knowOpacity, pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.05em" }}>
            Got it
          </span>
        </motion.div>

        {/* ── Draggable flip card ── */}
        <motion.div
          drag="x"
          dragElastic={0.12}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onClick={handleClick}
          style={{
            x, rotate,
            position: "absolute", inset: 0,
            cursor: "grab",
            touchAction: "pan-y",
          }}
          whileDrag={{ cursor: "grabbing" }}
        >
          {/* 3D flip inner */}
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            initial={{ rotateY: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d" }}
          >
            {/* FRONT */}
            <Face>
              {/* "Got it" badge — top right during drag */}
              <motion.div
                style={{
                  position: "absolute", top: 20, right: 20,
                  background: "var(--accent)", color: "#fff",
                  fontSize: 11, fontWeight: 700, padding: "4px 10px",
                  borderRadius: 999, opacity: knowOpacity,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                Got it ✓
              </motion.div>

              {/* "Still learning" badge — top left during drag */}
              <motion.div
                style={{
                  position: "absolute", top: 20, left: 20,
                  background: "var(--subtle)", color: "var(--muted)",
                  fontSize: 11, fontWeight: 700, padding: "4px 10px",
                  borderRadius: 999,
                  opacity: useTransform(x, [-120, -20], [1, 0]),
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                Nope
              </motion.div>

              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
                <h2 style={{
                  fontSize: "clamp(3rem, 13vw, 5.5rem)",
                  fontWeight: 700, lineHeight: 1,
                  letterSpacing: "-0.03em", textAlign: "center",
                  color: "var(--fg)", wordBreak: "break-word",
                }}>
                  {card.word}
                </h2>
              </div>

              <div style={{ padding: "0 28px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                  tap to reveal · swipe to answer
                </span>
                <button
                  onClick={speak}
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--subtle)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Volume2 size={14} color="var(--muted)" />
                </button>
              </div>
            </Face>

            {/* BACK */}
            <Face back>
              <div style={{ padding: "28px 28px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: "clamp(1.6rem, 6vw, 2.2rem)", fontWeight: 700, lineHeight: 1.1, color: "var(--fg)" }}>
                      {card.word}
                    </h3>
                    {card.phonetic && (
                      <p style={{ fontSize: 13, marginTop: 4, color: "var(--muted)" }}>{card.phonetic}</p>
                    )}
                    {card.partOfSpeech && (
                      <p style={{ fontSize: 11, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                        {card.partOfSpeech}
                      </p>
                    )}
                  </div>
                  {card.band && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", whiteSpace: "nowrap", marginTop: 4 }}>
                      Band {card.band}+
                    </span>
                  )}
                </div>
              </div>

              <div style={{ height: 1, background: "var(--border)", margin: "0 28px" }} />

              <div style={{ flex: 1, padding: "20px 28px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 500, color: "var(--fg)" }}>
                  {card.definition}
                </p>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
                  {card.example}
                </p>
                {card.tip && (
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted)", borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 4 }}>
                    💡 {card.tip}
                  </p>
                )}
              </div>

              <div style={{ padding: "0 28px 24px" }}>
                <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>
                  swipe to answer
                </span>
              </div>
            </Face>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Action row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <button
          onClick={() => flyOut("left")}
          style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
        >
          Still learning
        </button>
        <motion.button
          onClick={() => flyOut("right")}
          whileTap={{ scale: 0.86 }}
          title="Got it!"
          style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent)", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(244,81,30,0.3)" }}
        />
      </div>
    </div>
  );
}

function Face({ children, back }: { children: React.ReactNode; back?: boolean }) {
  return (
    <div style={{
      position: "absolute", inset: 0, borderRadius: 24,
      background: "var(--surface)",
      backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
      transform: back ? "rotateY(180deg)" : undefined,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {children}
    </div>
  );
}
