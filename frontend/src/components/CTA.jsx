import { motion } from "framer-motion";

export default function CTA({ onEnter }) {
  return (
    <motion.button
      type="button"
      onClick={onEnter}
      className="relative inline-flex h-14 items-center justify-center rounded-full border border-[#0c4f49] bg-[#10625b] px-7 text-sm font-semibold uppercase tracking-[0.22em] text-[#fffdf8] shadow-[0_16px_36px_rgba(16,98,91,0.22)] outline-none transition-colors hover:bg-[#0c4f49]"
      whileHover={{ scale: 1.045, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        scale: { type: "spring", stiffness: 260, damping: 18 }
      }}
    >
      Enter Prediction Lab
    </motion.button>
  );
}
