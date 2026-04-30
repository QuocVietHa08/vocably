import { motion } from "framer-motion";

interface TearProps {
  side: "left" | "right" | "both";
}

const teardrop = (cx: number, cy: number) => `M ${cx} ${cy} q -5 6 0 12 q 5 -6 0 -12 Z`;

export function Tear({ side }: TearProps) {
  const drops: Array<{ x: number; y: number; key: string }> = [];
  if (side === "left" || side === "both") drops.push({ x: 70, y: 110, key: "L" });
  if (side === "right" || side === "both") drops.push({ x: 130, y: 110, key: "R" });

  return (
    <>
      {drops.map((d) => (
        <motion.path
          key={d.key}
          d={teardrop(d.x, d.y)}
          fill="white"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: [0, 1, 1, 0], y: [0, 8, 16, 22] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeIn" }}
        />
      ))}
    </>
  );
}
