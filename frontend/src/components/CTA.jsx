import { motion } from "framer-motion";

export default function CTA({ onEnter }) {
  return (
    <motion.button
      type="button"
      onClick={onEnter}
      className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full border border-cyan-300/40 bg-cyan-300 px-7 text-sm font-semibold uppercase tracking-[0.22em] text-slate-950 shadow-glow outline-none"
      whileHover={{ scale: 1.045, y: -2 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        boxShadow: [
          "0 0 26px rgba(34, 211, 238, 0.32)",
          "0 0 56px rgba(168, 85, 247, 0.42)",
          "0 0 26px rgba(34, 211, 238, 0.32)"
        ]
      }}
      transition={{
        boxShadow: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 260, damping: 18 }
      }}
    >
      <span className="absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
      <span className="relative">Enter Prediction Lab</span>
    </motion.button>
  );
}
