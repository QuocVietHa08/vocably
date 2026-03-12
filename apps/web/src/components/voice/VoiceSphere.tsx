"use client";

import { useEffect, useRef } from "react";

export type SphereState = "idle" | "connecting" | "listening" | "speaking";

interface VoiceSphereProps {
  state: SphereState;
  audioLevel: number; // 0–1 normalised amplitude
  /** Canvas side length in px. All internal radii scale proportionally. Default 240. */
  size?: number;
}

const STATE_COLORS: Record<SphereState, { core: string; ring: string }> = {
  idle:       { core: "#e4e4e7", ring: "#e4e4e7" },
  connecting: { core: "#a1a1aa", ring: "#a1a1aa" },
  listening:  { core: "#f4511e", ring: "#f4511e" },
  speaking:   { core: "#0a0a0a", ring: "#0a0a0a" },
};

// Dark mode overrides (checked at runtime)
const DARK_STATE_COLORS: Record<SphereState, { core: string; ring: string }> = {
  idle:       { core: "#27272a", ring: "#27272a" },
  connecting: { core: "#52525b", ring: "#52525b" },
  listening:  { core: "#f4511e", ring: "#f4511e" },
  speaking:   { core: "#f5f5f5", ring: "#f5f5f5" },
};

export function VoiceSphere({ state, audioLevel, size = 240 }: VoiceSphereProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef(state);
  const levelRef   = useRef(audioLevel);
  const smoothRef  = useRef(0);
  const frameRef   = useRef<number>(0);

  useEffect(() => { stateRef.current = state; },      [state]);
  useEffect(() => { levelRef.current = audioLevel; }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const SIZE = canvas.width;
    const cx   = SIZE / 2;
    const cy   = SIZE / 2;
    // Scale all hardcoded radii relative to the default 240px canvas
    const s    = SIZE / 240;

    const draw = () => {
      smoothRef.current += (levelRef.current - smoothRef.current) * 0.18;
      const lvl = smoothRef.current;

      const dark   = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const colors = dark ? DARK_STATE_COLORS[stateRef.current] : STATE_COLORS[stateRef.current];

      ctx.clearRect(0, 0, SIZE, SIZE);

      const isActive = stateRef.current === "listening" || stateRef.current === "speaking";

      // Outer rings — expand with audio level
      if (isActive) {
        const numRings = 3;
        for (let i = numRings; i >= 1; i--) {
          const expansion = lvl * 48 * s * (i / numRings);
          const radius    = (64 + i * 14) * s + expansion;
          const opacity   = (0.18 - i * 0.04) * (0.4 + lvl * 0.6);
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = colors.ring;
          ctx.globalAlpha = Math.max(0, opacity);
          ctx.lineWidth   = 1;
          ctx.stroke();
        }
      }

      // Idle breathing ring
      if (stateRef.current === "idle") {
        const breathe = 0.5 + Math.sin(performance.now() / 1000 * 1.2) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, (72 + breathe * 6) * s, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ring;
        ctx.globalAlpha = 0.15 + breathe * 0.08;
        ctx.lineWidth   = 1;
        ctx.stroke();
      }

      // Connecting pulsing ring
      if (stateRef.current === "connecting") {
        const pulse = (Math.sin(performance.now() / 800) + 1) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, (70 + pulse * 12) * s, 0, Math.PI * 2);
        ctx.strokeStyle = colors.ring;
        ctx.globalAlpha = 0.2 + pulse * 0.15;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
      }

      // Core circle
      ctx.globalAlpha = 1;
      const coreRadius = (isActive ? 60 + lvl * 10 : 60) * s;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = colors.core;
      ctx.fill();

      // Inner highlight
      const grad = ctx.createRadialGradient(cx - 14 * s, cy - 14 * s, 4 * s, cx, cy, coreRadius);
      grad.addColorStop(0, "rgba(255,255,255,0.12)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []); // runs once; state/level read via refs

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block" }}
    />
  );
}
