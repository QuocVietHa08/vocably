// Face expression presets — easy to tweak.
// Coordinate space: 200x200 viewBox.
// Eyes are drawn as SVG paths so any shape (circle, line, arc) works uniformly.

export type ExpressionName =
  | "idle"
  | "happy"
  | "blink"
  | "listening"
  | "thinking"
  | "sleepy"
  | "laugh"
  | "angry"
  | "surprised"
  | "love"
  | "wink"
  | "sad"
  | "excited"
  | "confused"
  | "cool";

export interface EyePaths {
  left: string;
  right: string;
}

export interface Expression {
  eyes: EyePaths;
  mouth: string;
  // Subtle full-face motion
  bob?: { y: number; duration: number };
  // Optional per-eye vertical offset (for asymmetry / thinking)
  eyeOffset?: { left: number; right: number };
  // Pulse the glow
  pulse?: { intensity: number; duration: number };
  // Whether the mouth path should be filled (tongue / open laugh / heart-mouth)
  mouthFilled?: boolean;
  // Optional per-eye custom shapes (hearts, stars) drawn instead of the line
  eyeOverlay?: "hearts" | "stars" | "sparkles";
  // Tilt of the entire face in degrees (e.g. confused)
  tilt?: number;
  // Tear drop under an eye
  tear?: "left" | "right" | "both";
}

// ---- Eye shape helpers ----
const openEye = (cx: number, cy: number, h = 22) => `M ${cx} ${cy - h / 2} L ${cx} ${cy + h / 2}`;

const closedEye = (cx: number, cy: number, w = 18) => `M ${cx - w / 2} ${cy} L ${cx + w / 2} ${cy}`;

const happyEye = (cx: number, cy: number, w = 22) =>
  `M ${cx - w / 2} ${cy + 4} Q ${cx} ${cy - 8} ${cx + w / 2} ${cy + 4}`;

const angryEyeLeft = (cx: number, cy: number) => `M ${cx - 12} ${cy - 4} L ${cx + 12} ${cy + 4}`;
const angryEyeRight = (cx: number, cy: number) => `M ${cx - 12} ${cy + 4} L ${cx + 12} ${cy - 4}`;

const sleepyEye = (cx: number, cy: number, w = 22) =>
  `M ${cx - w / 2} ${cy} Q ${cx} ${cy + 5} ${cx + w / 2} ${cy}`;

// Wide circular eye (surprised) — drawn as a ring (open path is OK; stroke shows it)
const wideEye = (cx: number, cy: number, r = 14) =>
  `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

// Sad eye — downward curve (frowning eye)
const sadEye = (cx: number, cy: number, w = 22) =>
  `M ${cx - w / 2} ${cy - 4} Q ${cx} ${cy + 8} ${cx + w / 2} ${cy - 4}`;

// Confused eye — small slanted oval (just use openEye with offset, but keep simple)
const squintEye = (cx: number, cy: number, w = 16) =>
  `M ${cx - w / 2} ${cy} Q ${cx} ${cy - 4} ${cx + w / 2} ${cy}`;

// Eye centers
const LEFT = { x: 70, y: 95 };
const RIGHT = { x: 130, y: 95 };

// ---- Mouth helpers ----
const smile = (w = 40, depth = 14) =>
  `M ${100 - w / 2} 135 Q 100 ${135 + depth} ${100 + w / 2} 135`;
const bigSmile = `M 70 132 Q 100 165 130 132 Q 100 150 70 132 Z`;
const neutral = `M 88 138 L 112 138`;
const smallO = `M 92 138 Q 100 130 108 138 Q 100 146 92 138 Z`;
const tense = `M 86 140 Q 100 132 114 140`;
const relaxed = `M 90 140 Q 100 146 110 140`;
const surprisedO = `M 88 138 A 12 14 0 1 0 112 138 A 12 14 0 1 0 88 138 Z`;
const heartMouth = `M 100 132 C 96 126 86 128 88 136 C 90 144 100 150 100 150 C 100 150 110 144 112 136 C 114 128 104 126 100 132 Z`;
const sadMouth = `M 86 144 Q 100 130 114 144`;
const excitedMouth = `M 76 132 Q 100 160 124 132 Q 100 152 76 132 Z`;
const confusedMouth = `M 86 140 Q 96 134 104 142 Q 112 148 116 140`;
const smirkMouth = `M 86 142 Q 100 134 116 138`;

export const EXPRESSIONS: Record<ExpressionName, Expression> = {
  idle: {
    eyes: { left: openEye(LEFT.x, LEFT.y), right: openEye(RIGHT.x, RIGHT.y) },
    mouth: smile(28, 6),
    bob: { y: 2, duration: 4 },
  },
  happy: {
    eyes: { left: happyEye(LEFT.x, LEFT.y), right: happyEye(RIGHT.x, RIGHT.y) },
    mouth: smile(48, 16),
    bob: { y: 3, duration: 2.4 },
  },
  blink: {
    eyes: { left: closedEye(LEFT.x, LEFT.y), right: closedEye(RIGHT.x, RIGHT.y) },
    mouth: smile(28, 6),
  },
  listening: {
    eyes: { left: openEye(LEFT.x, LEFT.y, 26), right: openEye(RIGHT.x, RIGHT.y, 26) },
    mouth: smallO,
    bob: { y: 4, duration: 1.4 },
    pulse: { intensity: 1.4, duration: 1.4 },
  },
  thinking: {
    eyes: { left: openEye(LEFT.x, LEFT.y, 18), right: openEye(RIGHT.x, RIGHT.y, 22) },
    mouth: neutral,
    eyeOffset: { left: -6, right: -10 },
    bob: { y: 1, duration: 3 },
  },
  sleepy: {
    eyes: { left: sleepyEye(LEFT.x, LEFT.y), right: sleepyEye(RIGHT.x, RIGHT.y) },
    mouth: relaxed,
    bob: { y: 5, duration: 5 },
  },
  laugh: {
    eyes: { left: happyEye(LEFT.x, LEFT.y, 26), right: happyEye(RIGHT.x, RIGHT.y, 26) },
    mouth: bigSmile,
    mouthFilled: true,
    bob: { y: 8, duration: 0.45 },
  },
  angry: {
    eyes: { left: angryEyeLeft(LEFT.x, LEFT.y), right: angryEyeRight(RIGHT.x, RIGHT.y) },
    mouth: tense,
    bob: { y: 1.5, duration: 0.6 },
  },
  surprised: {
    eyes: { left: wideEye(LEFT.x, LEFT.y, 14), right: wideEye(RIGHT.x, RIGHT.y, 14) },
    mouth: surprisedO,
    mouthFilled: true,
    pulse: { intensity: 1.25, duration: 0.9 },
  },
  love: {
    eyes: { left: openEye(LEFT.x, LEFT.y), right: openEye(RIGHT.x, RIGHT.y) },
    mouth: heartMouth,
    mouthFilled: true,
    eyeOverlay: "hearts",
    bob: { y: 3, duration: 2 },
    pulse: { intensity: 1.35, duration: 1.6 },
  },
  wink: {
    eyes: { left: happyEye(LEFT.x, LEFT.y, 22), right: closedEye(RIGHT.x, RIGHT.y) },
    mouth: smirkMouth,
    bob: { y: 2, duration: 3 },
  },
  sad: {
    eyes: { left: sadEye(LEFT.x, LEFT.y), right: sadEye(RIGHT.x, RIGHT.y) },
    mouth: sadMouth,
    tear: "left",
    bob: { y: 1, duration: 5 },
  },
  excited: {
    eyes: { left: openEye(LEFT.x, LEFT.y, 24), right: openEye(RIGHT.x, RIGHT.y, 24) },
    mouth: excitedMouth,
    mouthFilled: true,
    eyeOverlay: "stars",
    bob: { y: 6, duration: 0.7 },
    pulse: { intensity: 1.4, duration: 0.9 },
  },
  confused: {
    eyes: { left: squintEye(LEFT.x, LEFT.y), right: openEye(RIGHT.x, RIGHT.y, 22) },
    mouth: confusedMouth,
    eyeOffset: { left: -2, right: -8 },
    tilt: -8,
    bob: { y: 1, duration: 3 },
  },
  cool: {
    // Will be hidden behind sunglasses accessory but still drawn for fallback
    eyes: { left: closedEye(LEFT.x, LEFT.y, 22), right: closedEye(RIGHT.x, RIGHT.y, 22) },
    mouth: smirkMouth,
    bob: { y: 2, duration: 3 },
  },
};

export const ALL_STATES: ExpressionName[] = [
  "idle",
  "happy",
  "blink",
  "listening",
  "thinking",
  "sleepy",
  "laugh",
  "angry",
  "surprised",
  "love",
  "wink",
  "sad",
  "excited",
  "confused",
  "cool",
];

// ============================================================
// Gender / persona presets — purely cosmetic, white-on-black
// ============================================================
export type GenderName = "neutral" | "feminine" | "masculine" | "androgynous";

export interface GenderPreset {
  // Eyelashes around the eyes (decorative lines)
  lashes?: boolean;
  // Soft blush circles on cheeks
  blush?: boolean;
  // Small hair tuft / antenna style on top
  topPiece?: "antenna" | "tuft" | "spike" | "bob" | "none";
  // Optional brow style above eyes
  brow?: "soft" | "thick" | "thin" | "none";
  // Subtle jaw outline (rounded square vs full circle)
  jaw?: "round" | "soft-square";
}

export const GENDERS: Record<GenderName, GenderPreset> = {
  neutral: {
    topPiece: "antenna",
    brow: "none",
    jaw: "round",
  },
  feminine: {
    lashes: true,
    blush: true,
    topPiece: "bob",
    brow: "thin",
    jaw: "round",
  },
  masculine: {
    topPiece: "spike",
    brow: "thick",
    jaw: "soft-square",
  },
  androgynous: {
    topPiece: "tuft",
    brow: "soft",
    blush: true,
    jaw: "round",
  },
};

export const ALL_GENDERS: GenderName[] = ["neutral", "feminine", "masculine", "androgynous"];

// ============================================================
// Accessory presets
// ============================================================
export type AccessoryName =
  | "none"
  | "bowtie"
  | "scarf"
  | "tophat"
  | "beanie"
  | "headphones"
  | "necklace"
  | "sunglasses"
  | "earrings";

export const ALL_ACCESSORIES: AccessoryName[] = [
  "none",
  "bowtie",
  "scarf",
  "tophat",
  "beanie",
  "headphones",
  "necklace",
  "sunglasses",
  "earrings",
];
