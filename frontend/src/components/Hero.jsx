import { useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import CTA from "./CTA.jsx";
import Laptop3D from "./Laptop3D.jsx";

export function NeuralBackground() {
    const nodes = useMemo(
        () =>
            Array.from({ length: 34 }, (_, index) => ({
                id: index,
                x: `${8 + ((index * 19) % 86)}%`,
                y: `${10 + ((index * 31) % 78)}%`,
                delay: (index % 8) * 0.32,
                size: 2 + (index % 4)
            })),
        []
    );

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(34,211,238,0.18),transparent_31%),radial-gradient(circle_at_76%_24%,rgba(168,85,247,0.24),transparent_24%),radial-gradient(circle_at_18%_82%,rgba(14,165,233,0.16),transparent_24%)]" />
            <motion.div
                className="absolute inset-[-18%] opacity-[0.28]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(125,211,252,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,.18) 1px, transparent 1px)",
                    backgroundSize: "72px 72px",
                    transform: "perspective(900px) rotateX(62deg) translateY(22%)"
                }}
                animate={{ backgroundPosition: ["0px 0px", "72px 72px"] }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.15),rgba(2,6,23,0.72)_72%,rgba(2,6,23,0.97))]" />
            {nodes.map((node) => (
                <motion.span
                    key={node.id}
                    className="absolute rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.75)]"
                    style={{
                        left: node.x,
                        top: node.y,
                        width: node.size,
                        height: node.size
                    }}
                    animate={{ opacity: [0.16, 0.9, 0.16], scale: [0.7, 1.6, 0.7] }}
                    transition={{ duration: 4.2, delay: node.delay, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
            <motion.div
                className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10"
                animate={{ scale: [0.94, 1.08, 0.94], opacity: [0.2, 0.55, 0.2] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
        </div>
    );
}

export default function Hero({ onEnterLab }) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { stiffness: 80, damping: 24 });
    const smoothY = useSpring(mouseY, { stiffness: 80, damping: 24 });
    const textX = useTransform(smoothX, [-1, 1], [-18, 18]);
    const textY = useTransform(smoothY, [-1, 1], [-10, 10]);
    const glowX = useTransform(smoothX, [-1, 1], ["28%", "72%"]);
    const glowY = useTransform(smoothY, [-1, 1], ["32%", "68%"]);
    const [isAwake, setIsAwake] = useState(false);
    const [isHoveringLaptop, setIsHoveringLaptop] = useState(false);

    function handleMouseMove(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
        mouseY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
        if (!isAwake) setIsAwake(true);
    }

    return (
        <main
            className="relative min-h-screen overflow-hidden bg-[#020617] text-white"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                mouseX.set(0);
                mouseY.set(0);
                setIsHoveringLaptop(false);
            }}
        >
            <header className="absolute top-0 left-0 p-8 z-50 text-2xl font-bold text-cyan-400 tracking-tighter">
                LAPIS AI
            </header>

            <NeuralBackground />
            <motion.div className="pointer-events-none absolute h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/16 blur-3xl" style={{ left: glowX, top: glowY }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent,rgba(2,6,23,0.38)_55%,rgba(2,6,23,0.9))]" />

            <section className="relative z-10 grid min-h-screen grid-cols-1 items-center gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[0.86fr_1.14fr] lg:px-16">
                <motion.div
                    className="mx-auto max-w-3xl pt-10 text-center lg:mx-0 lg:text-left"
                    style={{ x: textX, y: textY }}
                >

                    <motion.h1
                        className="max-w-5xl text-balance text-5xl font-semibold leading-[0.96] tracking-normal text-white sm:text-6xl lg:text-7xl xl:text-8xl"
                        initial={{ opacity: 0, y: 34, filter: "blur(18px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                        ML-Powered Laptop price prediction
                    </motion.h1>

                    <motion.p
                        className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-8 text-slate-300 sm:text-lg lg:mx-0"
                        initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.9, delay: 0.62 }}
                    >
                        A next-generation machine learning system that estimates laptop prices
                        using intelligent hardware analysis.
                    </motion.p>

                    <motion.div
                        className="mt-9 flex justify-center lg:justify-start"
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.88 }}
                    >
                        <CTA onEnter={onEnterLab} />
                    </motion.div>
                </motion.div>

                <motion.div
                    className="relative h-[46vh] min-h-[340px] lg:h-[78vh]"
                    onPointerEnter={() => setIsHoveringLaptop(true)}
                    onPointerLeave={() => setIsHoveringLaptop(false)}
                    initial={{ opacity: 0, scale: 0.9, filter: "blur(18px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.2, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Laptop3D mouseX={smoothX} mouseY={smoothY} isAwake={isAwake} isHovering={isHoveringLaptop} />
                </motion.div>
            </section>
        </main>
    );
}