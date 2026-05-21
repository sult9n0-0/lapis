import React, { useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

const KEY_ROWS_DATA = [
    {
        row: 0,
        z: -0.45,
        keys: [
            { label: "Esc", size: 1 }, { label: "F1", size: 1 }, { label: "F2", size: 1 }, { label: "F3", size: 1 }, { label: "F4", size: 1 },
            { label: "F5", size: 1 }, { label: "F6", size: 1 }, { label: "F7", size: 1 }, { label: "F8", size: 1 }, { label: "F9", size: 1 },
            { label: "F10", size: 1 }, { label: "F11", size: 1 }, { label: "F12", size: 1 }, { label: "Prt", size: 1 }, { label: "Del", size: 1.1 }
        ]
    },
    {
        row: 1,
        z: -0.27,
        keys: [
            { label: "`", size: 1 }, { label: "1", size: 1 }, { label: "2", size: 1 }, { label: "3", size: 1 }, { label: "4", size: 1 },
            { label: "5", size: 1 }, { label: "6", size: 1 }, { label: "7", size: 1 }, { label: "8", size: 1 }, { label: "9", size: 1 },
            { label: "0", size: 1 }, { label: "-", size: 1 }, { label: "=", size: 1 }, { label: "Back", size: 2.1 }
        ]
    },
    {
        row: 2,
        z: -0.09,
        keys: [
            { label: "Tab", size: 1.5 }, { label: "Q", size: 1 }, { label: "W", size: 1 }, { label: "E", size: 1 }, { label: "R", size: 1 },
            { label: "T", size: 1 }, { label: "Y", size: 1 }, { label: "U", size: 1 }, { label: "I", size: 1 }, { label: "O", size: 1 },
            { label: "P", size: 1 }, { label: "[", size: 1 }, { label: "]", size: 1 }, { label: "\\", size: 1.6 }
        ]
    },
    {
        row: 3,
        z: 0.09,
        keys: [
            { label: "Caps", size: 1.85 }, { label: "A", size: 1 }, { label: "S", size: 1 }, { label: "D", size: 1 }, { label: "F", size: 1 },
            { label: "G", size: 1 }, { label: "H", size: 1 }, { label: "J", size: 1 }, { label: "K", size: 1 }, { label: "L", size: 1 },
            { label: ";", size: 1 }, { label: "'", size: 1 }, { label: "Enter", size: 2.25 }
        ]
    },
    {
        row: 4,
        z: 0.27,
        keys: [
            { label: "Shift", size: 2.35 }, { label: "Z", size: 1 }, { label: "X", size: 1 }, { label: "C", size: 1 }, { label: "V", size: 1 },
            { label: "B", size: 1 }, { label: "N", size: 1 }, { label: "M", size: 1 }, { label: ",", size: 1 }, { label: ".", size: 1 },
            { label: "/", size: 1 }, { label: "Shift", size: 2.75 }
        ]
    },
    {
        row: 5,
        z: 0.45,
        keys: [
            { label: "Ctrl", size: 1.35 }, { label: "Fn", size: 1 }, { label: "Win", size: 1 }, { label: "Alt", size: 1.35 },
            { label: "Space", size: 6.1 },
            { label: "Alt", size: 1.35 }, { label: "Ctrl", size: 1.35 }, { label: "◀", size: 1 }, { label: "▼", size: 1 }, { label: "▶", size: 1 }
        ]
    }
];

function CustomKey({ keyData }) {
    const isLongLabel = keyData.label.length > 2;
    const fontSize = isLongLabel ? 0.06 : 0.08;
    return (
        <group position={[keyData.x, -0.44, keyData.z]}>
            <mesh position={[0, 0.008, 0]}>
                <boxGeometry args={[keyData.width - 0.005, 0.016, keyData.depth - 0.005]} />
                <meshStandardMaterial
                    color="#ff0000"
                    emissive="#ff0000"
                    emissiveIntensity={keyData.isWASD ? 4.5 : 2.2}
                    roughness={0.1}
                    metalness={0.1}
                />
            </mesh>
            <RoundedBox
                args={[keyData.width - 0.012, 0.024, keyData.depth - 0.012]}
                radius={0.015}
                smoothness={4}
                position={[0, 0.016, 0]}
            >
                <meshStandardMaterial
                    color={keyData.isWASD ? "#ffebeb" : "#ffffff"}
                    roughness={0.15}
                    metalness={0.05}
                />
            </RoundedBox>
            <Suspense fallback={null}>
                <Text
                    position={[0, 0.029, 0]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMVgp9p.woff2"
                    fontSize={fontSize}
                    color="#000000"
                    fontWeight="bold"
                    maxWidth={keyData.width - 0.02}
                    textAlign="center"
                    anchorX="center"
                    anchorY="middle"
                    depthOffset={1}
                >
                    {keyData.label}
                </Text>
            </Suspense>
        </group>
    );
}

function FullKeyboard() {
    const keyboardLayout = useMemo(() => {
        const layout = [];
        const unitStep = 0.21;
        const gap = 0.032;
        KEY_ROWS_DATA.forEach((rowInfo) => {
            const totalSize = rowInfo.keys.reduce((sum, k) => sum + k.size, 0);
            let currentX = -(totalSize * unitStep) / 2;
            rowInfo.keys.forEach((key, index) => {
                const keyWidth = key.size * unitStep - gap;
                const keyCenterX = currentX + (key.size * unitStep) / 2;
                const isWASD = ["W", "A", "S", "D"].includes(key.label);
                layout.push({
                    id: `${rowInfo.row}-${index}-${key.label}`,
                    label: key.label,
                    x: keyCenterX,
                    z: rowInfo.z,
                    width: keyWidth,
                    depth: 0.145,
                    isWASD
                });
                currentX += key.size * unitStep;
            });
        });
        return layout;
    }, []);
    return (
        <group>
            {keyboardLayout.map((keyData) => (
                <CustomKey key={keyData.id} keyData={keyData} />
            ))}
        </group>
    );
}

function DynamicDisplay() {
    const canvasRef = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 576;
        return canvas;
    }, []);
    const texture = useMemo(() => new THREE.CanvasTexture(canvasRef), [canvasRef]);
    useFrame(({ clock }) => {
        const ctx = canvasRef.getContext("2d");
        if (!ctx) return;
        const t = clock.getElapsedTime();
        ctx.fillStyle = "#030002";
        ctx.fillRect(0, 0, canvasRef.width, canvasRef.height);
        ctx.strokeStyle = "rgba(200,0,0,0.06)";
        ctx.lineWidth = 1;
        const step = 32;
        for (let x = 0; x < canvasRef.width; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvasRef.height); ctx.stroke();
        }
        for (let y = 0; y < canvasRef.height; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvasRef.width, y); ctx.stroke();
        }
        ctx.fillStyle = "rgba(240,15,15,0.95)";
        ctx.font = "bold 26px monospace";
        ctx.fillText("CRIMSON ENGINE BIOS v4.51", 60, 80);
        ctx.fillText("SYSTEM HEALTH: EXTREME OVERCLOCK", 60, 120);
        ctx.fillText("COOLING FLUID SPEED: 6500 RPM", 60, 160);
        ctx.fillStyle = "rgba(255,50,50,0.65)";
        ctx.font = "14px monospace";
        for (let i = 0; i < 15; i++) {
            const lineStr = `[MONITOR] TEMP_ZONE_0${i} -> STABLE ADDR: 0x${(2048 * i + 112).toString(16).toUpperCase()}`;
            ctx.fillText(lineStr, 60, 220 + i * 20);
        }
        ctx.fillStyle = "rgba(60,0,0,0.6)";
        ctx.fillRect(660, 80, 280, 30);
        ctx.fillRect(660, 140, 280, 30);
        ctx.fillRect(660, 200, 280, 30);
        ctx.fillStyle = "rgba(255,10,10,0.9)";
        const bar1 = 150 + Math.sin(t * 1.8) * 45;
        const bar2 = 200 + Math.cos(t * 2.5) * 30;
        const bar3 = 220 + Math.sin(t * 0.9) * 20;
        ctx.fillRect(660, 80, bar1, 30);
        ctx.fillRect(660, 140, bar2, 30);
        ctx.fillRect(660, 200, bar3, 30);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px monospace";
        ctx.fillText(`GPU TEMP: ${(bar1 / 3).toFixed(1)}°C`, 670, 100);
        ctx.fillText(`CPU LOAD: ${(bar2 / 3.1).toFixed(1)}%`, 670, 160);
        ctx.fillText(`VRAM SPEED: ${(bar3 * 4.2).toFixed(0)} MHz`, 670, 220);
        ctx.fillStyle = "rgba(255,0,0,0.5)";
        ctx.fillRect(60, 520, 904, 8);
        texture.needsUpdate = true;
    });
    return (
        <mesh position={[0, 0.02, 0.041]}>
            <planeGeometry args={[3.45, 2.05]} />
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
}

function PalmRestDragonLogo() {
    return (
        <group position={[1.15, -0.436, 0.95]} rotation={[-Math.PI / 2, 0, -0.2]}>
            <mesh>
                <ringGeometry args={[0.11, 0.13, 6]} />
                <meshBasicMaterial color="#ff0000" toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, 0.005]}>
                <planeGeometry args={[0.1, 0.1]} />
                <meshBasicMaterial color="#ff2222" transparent opacity={0.85} toneMapped={false} />
            </mesh>
        </group>
    );
}

function LaptopModel() {
    const SCREEN_HINGE_ANGLE = (20 * Math.PI) / 180;
    return (
        <group scale={1.08} rotation={[-0.08, -0.32, 0]} position={[-1.2, -0.15, 0]}>
            <RoundedBox args={[4.22, 0.16, 2.65]} radius={0.06} smoothness={10} position={[0, -0.52, 0.35]}>
                <meshPhysicalMaterial
                    color="#0b0e14"
                    roughness={0.4}
                    metalness={0.9}
                    clearcoat={0.25}
                    clearcoatRoughness={0.3}
                />
            </RoundedBox>
            <RoundedBox args={[1.15, 0.005, 0.65]} radius={0.015} smoothness={6} position={[0, -0.442, 1.15]}>
                <meshStandardMaterial
                    color="#080b0f"
                    roughness={0.4}
                    metalness={0.7}
                    emissive="#ff0000"
                    emissiveIntensity={0.65}
                />
            </RoundedBox>
            <group position={[0, 0, 0.20]}>
                <FullKeyboard />
            </group>
            <PalmRestDragonLogo />
            <group position={[0, -0.44, -0.78]} rotation={[-SCREEN_HINGE_ANGLE, 0, 0]}>
                <RoundedBox args={[3.95, 2.45, 0.08]} radius={0.06} smoothness={10} position={[0, 1.18, -0.045]}>
                    <meshPhysicalMaterial
                        color="#080b10"
                        roughness={0.35}
                        metalness={0.9}
                        clearcoat={0.3}
                    />
                </RoundedBox>
                <RoundedBox args={[0.3, 0.3, 0.02]} radius={0.015} position={[0, 1.18, -0.095]}>
                    <meshStandardMaterial
                        color="#040609"
                        emissive="#ff0000"
                        emissiveIntensity={3.5}
                    />
                </RoundedBox>
                <RoundedBox args={[3.82, 2.32, 0.02]} radius={0.04} smoothness={8} position={[0, 1.18, 0.005]}>
                    <meshStandardMaterial color="#030407" roughness={0.65} />
                </RoundedBox>
                <group position={[0, 1.18, 0]}>
                    <DynamicDisplay />
                </group>
                <rectAreaLight
                    width={3.6}
                    height={2.2}
                    color="#ff0000"
                    intensity={3.0}
                    position={[0, 1.18, 0.04]}
                    rotation={[0.12, Math.PI, 0]}
                />
            </group>
        </group>
    );
}

function CameraRig() {
    const { camera } = useThree();
    useFrame((state, delta) => {
        const targetZ = 7.4;
        const targetY = 1.45;
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 5 * delta);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 5 * delta);
        camera.lookAt(0, -0.15, 0);
    });
    return null;
}

export default function App() {
    return (
        <div className="relative h-screen w-screen text-white overflow-hidden select-none">
            <div className="absolute inset-0">
                <Canvas shadows camera={{ position: [0, 1.4, 7.4], fov: 40 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[3, 6, 4]} intensity={2.2} castShadow />
                    <pointLight position={[-4, 3, 2]} intensity={1.5} color="#ff0000" />
                    <pointLight position={[4, -1, 2]} intensity={1.5} color="#ff0022" />
                    <pointLight position={[0, -0.2, 1.5]} intensity={2.2} color="#ff0000" />
                    <Environment preset="night" />
                    <Suspense fallback={null}>
                        <Float speed={3.5} rotationIntensity={0.5} floatIntensity={1.2}>
                            <LaptopModel />
                        </Float>
                    </Suspense>
                    <CameraRig />
                </Canvas>
            </div>
        </div>
    );
}