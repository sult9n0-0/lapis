import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LandingPage from "./pages/LandingPage.jsx";
import PredictionLab from "./pages/PredictionLab.jsx";

export default function App() {
  const [screen, setScreen] = useState("landing");

  return (
    <AnimatePresence mode="wait">
      {screen === "landing" ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.08, filter: "blur(18px)" }}
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <LandingPage onEnterLab={() => setScreen("prediction")} />
        </motion.div>
      ) : (
        <motion.div
          key="prediction"
          initial={{ opacity: 0, scale: 0.94, filter: "blur(22px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.98, filter: "blur(12px)" }}
          transition={{ duration: 0.88, ease: [0.16, 1, 0.3, 1] }}
        >
          <PredictionLab onBack={() => setScreen("landing")} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
