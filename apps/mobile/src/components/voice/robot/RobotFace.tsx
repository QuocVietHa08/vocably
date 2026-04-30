import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import type { AccessoryName, ExpressionName, GenderName } from "./expressions";

type StrokeFace = {
  title: string;
  caption: string;
  glow: number;
  tilt: number;
  accent: string;
  particles: string[];
  draw: (tone: string) => ReactNode;
};

const FACE: Record<ExpressionName, StrokeFace> = {
  idle: {
    title: "Idle",
    caption: "Small calm face with a relaxed cat-like smile.",
    glow: 0.9,
    tilt: 0,
    accent: "#f4ffff",
    particles: ["·", "˚", "✦"],
    draw: (tone) => (
      <>
        <Line d="M 66 130 H 106" tone={tone} />
        <Line d="M 214 130 H 254" tone={tone} />
        <Line d="M 135 147 Q 146 158 157 147" tone={tone} />
        <Line d="M 163 147 Q 174 158 185 147" tone={tone} />
      </>
    ),
  },
  happy: {
    title: "Happy",
    caption: "Bright lifted cheeks and a soft smiling mouth.",
    glow: 1.16,
    tilt: -1,
    accent: "#a8fff3",
    particles: ["✦", "✨", "°"],
    draw: (tone) => (
      <>
        <Line d="M 72 148 Q 92 126 112 148" tone={tone} />
        <Line d="M 208 148 Q 228 126 248 148" tone={tone} />
        <Line d="M 132 192 Q 160 215 188 192" tone={tone} />
      </>
    ),
  },
  blink: {
    title: "Blink",
    caption: "Clean closed-eye arcs inspired by the reference sheet.",
    glow: 0.95,
    tilt: 0,
    accent: "#f4ffff",
    particles: ["˚", "·"],
    draw: (tone) => (
      <>
        <Line d="M 72 144 Q 92 158 112 144" tone={tone} />
        <Line d="M 208 144 Q 228 158 248 144" tone={tone} />
        <Line d="M 142 190 Q 160 198 178 190" tone={tone} />
      </>
    ),
  },
  listening: {
    title: "Listening",
    caption: "Focused rounded eyes with a small attentive mouth.",
    glow: 1.05,
    tilt: -1.5,
    accent: "#dffffa",
    particles: ["♪", "♫", "·"],
    draw: (tone) => (
      <>
        <Ring cx={98} cy={148} tone={tone} />
        <Ring cx={222} cy={148} tone={tone} />
        <Line d="M 151 192 Q 160 184 169 192 Q 160 202 151 192 Z" tone={tone} />
      </>
    ),
  },
  thinking: {
    title: "Thinking",
    caption: "Curious side-eye with a tiny kiss-like thinking mouth.",
    glow: 1,
    tilt: -4,
    accent: "#f4ffff",
    particles: ["?", "?", "·"],
    draw: (tone) => (
      <>
        <Line d="M 70 138 H 106" tone={tone} />
        <Line d="M 214 138 H 250" tone={tone} />
        <Line d="M 154 165 C 184 148 184 196 154 181" tone={tone} />
      </>
    ),
  },
  sleepy: {
    title: "Sleepy",
    caption: "Sleepy half arcs and a peaceful tiny mouth.",
    glow: 0.86,
    tilt: 1,
    accent: "#d7fff8",
    particles: ["z", "Z", "˚"],
    draw: (tone) => (
      <>
        <Line d="M 72 146 Q 92 156 112 146" tone={tone} />
        <Line d="M 208 146 Q 228 156 248 146" tone={tone} />
        <Line d="M 143 190 Q 160 202 177 190" tone={tone} />
      </>
    ),
  },
  laugh: {
    title: "Laugh",
    caption: "Squinting joy with a big open smile.",
    glow: 1.25,
    tilt: 1.5,
    accent: "#ffffff",
    particles: ["✦", "✧", "✨"],
    draw: (tone) => (
      <>
        <Line d="M 72 138 L 112 158" tone={tone} />
        <Line d="M 248 138 L 208 158" tone={tone} />
        <Line d="M 124 188 Q 160 228 196 188" tone={tone} />
        <Line d="M 137 196 Q 160 210 183 196" tone={tone} />
      </>
    ),
  },
  angry: {
    title: "Angry",
    caption: "Sharper eye slashes and a tense mouth.",
    glow: 1.1,
    tilt: -2,
    accent: "#ffffff",
    particles: ["怒", "!", "✦"],
    draw: (tone) => (
      <>
        <Line d="M 70 132 L 116 160" tone={tone} />
        <Line d="M 250 132 L 204 160" tone={tone} />
        <Line d="M 142 204 Q 160 190 178 204" tone={tone} />
      </>
    ),
  },
  surprised: {
    title: "Surprised",
    caption: "Round eyes and a small open shock mouth.",
    glow: 1.22,
    tilt: 0,
    accent: "#ffffff",
    particles: ["!", "°", "✦"],
    draw: (tone) => (
      <>
        <Ring cx={96} cy={144} tone={tone} />
        <Ring cx={224} cy={144} tone={tone} />
        <Line d="M 146 190 Q 160 170 174 190 Q 160 210 146 190 Z" tone={tone} />
      </>
    ),
  },
  love: {
    title: "Love",
    caption: "Heart-like sparkle eyes and a tiny kiss.",
    glow: 1.28,
    tilt: 1,
    accent: "#ffffff",
    particles: ["♡", "♥", "✦"],
    draw: (tone) => (
      <>
        <Line
          d="M 72 150 C 62 132 88 126 96 144 C 104 126 130 132 120 150 C 108 166 84 166 72 150 Z"
          tone={tone}
        />
        <Line
          d="M 200 150 C 190 132 216 126 224 144 C 232 126 258 132 248 150 C 236 166 212 166 200 150 Z"
          tone={tone}
        />
        <Line d="M 150 190 Q 160 176 170 190 Q 160 204 150 190 Z" tone={tone} />
      </>
    ),
  },
  wink: {
    title: "Wink",
    caption: "One rounded eye and one playful closed eye.",
    glow: 1.08,
    tilt: -2,
    accent: "#dffffa",
    particles: ["✧", "·"],
    draw: (tone) => (
      <>
        <Ring cx={98} cy={146} tone={tone} />
        <Line d="M 206 146 Q 228 158 250 146" tone={tone} />
        <Line d="M 138 192 Q 160 206 184 190" tone={tone} />
      </>
    ),
  },
  sad: {
    title: "Sad",
    caption: "Downturned face with subtle tear drops.",
    glow: 0.9,
    tilt: 1.5,
    accent: "#d8fff8",
    particles: ["·", "涙"],
    draw: (tone) => (
      <>
        <Line d="M 76 154 Q 96 136 116 154" tone={tone} />
        <Line d="M 204 154 Q 224 136 244 154" tone={tone} />
        <Line d="M 136 202 Q 160 184 184 202" tone={tone} />
        <Tear cx={102} cy={178} tone={tone} />
        <Tear cx={218} cy={178} tone={tone} />
      </>
    ),
  },
  excited: {
    title: "Excited",
    caption: "High energy dot eyes and an open happy mouth.",
    glow: 1.32,
    tilt: -1,
    accent: "#ffffff",
    particles: ["✦", "✦", "✨"],
    draw: (tone) => (
      <>
        <Dot cx={95} cy={145} tone={tone} />
        <Dot cx={225} cy={145} tone={tone} />
        <Line d="M 140 188 Q 160 214 180 188 Q 160 204 140 188 Z" tone={tone} />
      </>
    ),
  },
  confused: {
    title: "Confused",
    caption: "Uneven puzzled eyes with a wavy mouth.",
    glow: 1,
    tilt: -5,
    accent: "#f4ffff",
    particles: ["?", "?", "˚"],
    draw: (tone) => (
      <>
        <Line d="M 76 150 Q 96 138 116 150" tone={tone} />
        <Line d="M 204 144 H 244" tone={tone} />
        <Line d="M 132 198 Q 146 184 160 198 Q 174 212 188 198" tone={tone} />
      </>
    ),
  },
  cool: {
    title: "Cool",
    caption: "Low relaxed eyes and a confident tiny smirk.",
    glow: 1.08,
    tilt: -1,
    accent: "#f4ffff",
    particles: ["#", "✦"],
    draw: (tone) => (
      <>
        <Line d="M 70 142 H 118" tone={tone} />
        <Line d="M 202 142 H 250" tone={tone} />
        <Line d="M 134 200 Q 160 188 186 196" tone={tone} />
      </>
    ),
  },
};

const FLOATING_LAYOUTS = [
  { left: "8%", top: "18%", delay: 0 },
  { right: "7%", top: "28%", delay: 0.35 },
  { left: "17%", bottom: "26%", delay: 0.7 },
];

interface RobotFaceProps {
  state: ExpressionName;
  gender?: GenderName;
  accessory?: AccessoryName;
  size?: number;
}

export function RobotFace({ state, size = 440 }: RobotFaceProps) {
  const reduceMotion = useReducedMotion();
  const face = FACE[state];

  return (
    <section className="robot-face-module robot-face-module--emotion relative flex w-full flex-col items-center gap-4 overflow-hidden">
      <div className="robot-face-module__glow absolute inset-x-[5%] top-[5%] h-[58%] rounded-full blur-3xl" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        {face.particles.map((particle, index) => (
          <motion.span
            key={`${face.title}-${particle}-${index}`}
            className="absolute text-xl font-semibold text-white/45"
            style={FLOATING_LAYOUTS[index % FLOATING_LAYOUTS.length]}
            animate={
              reduceMotion
                ? { opacity: 0.45 }
                : { opacity: [0, 0.52, 0], y: [10, -18, -32], rotate: [-6, 8, -4] }
            }
            transition={{
              duration: 4,
              delay: FLOATING_LAYOUTS[index % FLOATING_LAYOUTS.length].delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {particle}
          </motion.span>
        ))}
      </div>

      <motion.div
        className="relative"
        style={{
          width: `min(${size}px, calc(100vw - 3.5rem))`,
          aspectRatio: "1 / 0.9",
        }}
        animate={reduceMotion ? undefined : { y: [0, -5, 0, 3, 0], rotate: [0, face.tilt, 0] }}
        transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-x-[18%] bottom-[3%] h-[14%] rounded-full bg-white/14 blur-3xl" />

        <div className="robot-expression-shell absolute inset-x-[5%] top-[3%] h-[86%] rounded-[31%]">
          <div className="robot-expression-screen absolute inset-[7%] overflow-hidden rounded-[25%]">
            <div className="robot-expression-screen__grain absolute inset-0" />
            <div className="robot-expression-screen__shine absolute inset-0" />
            <svg
              viewBox="0 0 320 280"
              className="absolute inset-0 h-full w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="emotion-glow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="emotion-core" cx="50%" cy="48%" r="58%">
                  <stop offset="0%" stopColor={`${face.accent}30`} />
                  <stop offset="55%" stopColor={`${face.accent}0d`} />
                  <stop offset="100%" stopColor={`${face.accent}00`} />
                </radialGradient>
              </defs>

              <motion.ellipse
                cx="160"
                cy="150"
                rx="118"
                ry="92"
                fill="url(#emotion-core)"
                animate={reduceMotion ? undefined : { opacity: [0.58, face.glow, 0.64] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.g
                filter="url(#emotion-glow)"
                animate={reduceMotion ? undefined : { scale: [1, 1.015, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "160px 155px" }}
              >
                {face.draw(face.accent)}
              </motion.g>
            </svg>
          </div>
        </div>
      </motion.div>

      <div className="robot-info-panel relative z-30 w-full rounded-[24px] border border-white/8 bg-black/20 px-4 py-4 text-left backdrop-blur-xl sm:px-5">
        <p className="text-[0.68rem] uppercase tracking-[0.35em] text-white/45">Active Emotion</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{face.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/62">{face.caption}</p>
      </div>
    </section>
  );
}

function Line({ d, tone }: { d: string; tone: string }) {
  return (
    <path
      d={d}
      stroke={tone}
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

function Ring({ cx, cy, tone }: { cx: number; cy: number; tone: string }) {
  return <circle cx={cx} cy={cy} r="21" stroke={tone} strokeWidth="7" />;
}

function Dot({ cx, cy, tone }: { cx: number; cy: number; tone: string }) {
  return <circle cx={cx} cy={cy} r="10" fill={tone} />;
}

function Tear({ cx, cy, tone }: { cx: number; cy: number; tone: string }) {
  return (
    <path
      d={`M ${cx} ${cy} C ${cx - 10} ${cy + 12} ${cx - 6} ${cy + 25} ${cx} ${cy + 25} C ${cx + 6} ${cy + 25} ${cx + 10} ${cy + 12} ${cx} ${cy} Z`}
      stroke={tone}
      strokeWidth="5"
      fill="none"
      strokeLinejoin="round"
    />
  );
}
