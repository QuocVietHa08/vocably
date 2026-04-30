import { motion } from "framer-motion";

interface EyeOverlayProps {
  kind: "hearts" | "stars" | "sparkles";
}

const LEFT = { x: 70, y: 95 };
const RIGHT = { x: 130, y: 95 };

const heart = (cx: number, cy: number, s = 1) =>
  `M ${cx} ${cy + 6 * s} C ${cx - 12 * s} ${cy - 4 * s} ${cx - 12 * s} ${cy - 16 * s} ${cx} ${cy - 6 * s} C ${cx + 12 * s} ${cy - 16 * s} ${cx + 12 * s} ${cy - 4 * s} ${cx} ${cy + 6 * s} Z`;

const star = (cx: number, cy: number, r = 10) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r / 2.4;
    pts.push(`${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

export function EyeOverlay({ kind }: EyeOverlayProps) {
  if (kind === "hearts") {
    return (
      <motion.g
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: [0.9, 1.1, 0.95], opacity: 1 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 95px" }}
      >
        <path d={heart(LEFT.x, LEFT.y, 0.9)} fill="white" />
        <path d={heart(RIGHT.x, RIGHT.y, 0.9)} fill="white" />
      </motion.g>
    );
  }
  if (kind === "stars") {
    return (
      <motion.g
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "100px 95px" }}
      >
        <path d={star(LEFT.x, LEFT.y, 11)} fill="white" />
        <path d={star(RIGHT.x, RIGHT.y, 11)} fill="white" />
      </motion.g>
    );
  }
  return (
    <g>
      <circle cx={LEFT.x} cy={LEFT.y} r={3} fill="white" />
      <circle cx={RIGHT.x} cy={RIGHT.y} r={3} fill="white" />
    </g>
  );
}
