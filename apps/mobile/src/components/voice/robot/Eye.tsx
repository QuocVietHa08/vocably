import { motion } from "framer-motion";

interface EyeProps {
  d: string;
  offsetY?: number;
}

export function Eye({ d, offsetY = 0 }: EyeProps) {
  return (
    <motion.g animate={{ y: offsetY }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
      <motion.path
        d={d}
        fill="none"
        stroke="white"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ d }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      />
    </motion.g>
  );
}
