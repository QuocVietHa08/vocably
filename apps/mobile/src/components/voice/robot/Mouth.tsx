import { motion } from "framer-motion";

interface MouthProps {
  d: string;
  filled?: boolean;
}

export function Mouth({ d, filled }: MouthProps) {
  return (
    <motion.path
      d={d}
      fill={filled ? "white" : "none"}
      stroke="white"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{ d }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    />
  );
}
