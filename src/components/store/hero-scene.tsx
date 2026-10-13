"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, MeshTransmissionMaterial } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

function LiquidChrome() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.18;
    ref.current.rotation.z += dt * 0.05;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.05, 48]} />
      <MeshDistortMaterial color="#e6e9ef" metalness={1} roughness={0.06} distort={0.36} speed={1.3} envMapIntensity={1.35} />
    </mesh>
  );
}

function GlassRing({ low }: { low: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z -= dt * 0.12;
  });
  return (
    <mesh ref={ref} rotation={[1.15, 0.25, 0]}>
      <torusGeometry args={[1.72, 0.17, low ? 32 : 64, low ? 96 : 180]} />
      <MeshTransmissionMaterial
        samples={low ? 3 : 6}
        resolution={low ? 192 : 384}
        transmission={1}
        thickness={0.55}
        roughness={0.04}
        ior={1.35}
        chromaticAberration={0.35}
        anisotropicBlur={0.2}
        distortion={0.25}
        distortionScale={0.4}
        temporalDistortion={0.08}
        iridescence={1}
        iridescenceIOR={1.25}
        iridescenceThicknessRange={[100, 800]}
        backside={false}
        color="#f3f6ff"
      />
    </mesh>
  );
}

function Droplet({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <Float speed={1.6} rotationIntensity={0.6} floatIntensity={1.4}>
      <mesh position={position} scale={scale}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#dfe3ea" metalness={1} roughness={0.08} envMapIntensity={1.2} />
      </mesh>
    </Float>
  );
}

/** Rotates the whole object softly toward the pointer (page-wide, via eventSource). */
function PointerRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.45, 2.2, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.3, 2.2, dt);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
  });
  return <group ref={group}>{children}</group>;
}

export default function HeroScene({ active, low, onReady }: { active: boolean; low: boolean; onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 5.4], fov: 38 }}
      gl={{ antialias: !low, alpha: false, powerPreference: "high-performance", stencil: false }}
      eventSource={typeof document !== "undefined" ? document.documentElement : undefined}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        requestAnimationFrame(() => onReady?.());
      }}
      aria-hidden
    >
      <color attach="background" args={["#0b0b11"]} />
      <Environment files="/hero/studio.hdr" environmentIntensity={1} resolution={256}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 3, 2]} scale={[6, 1, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#7ee7ff" position={[-4, 0, 1]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ff9de2" position={[4, -1, 1]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} />
        <Lightformer form="ring" intensity={1.6} color="#b49cff" position={[0, -3, -2]} scale={3} />
      </Environment>
      <PointerRig>
        <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.5}>
          <LiquidChrome />
          <GlassRing low={low} />
        </Float>
        <Droplet position={[-2.1, 1.1, -0.6]} scale={0.16} />
        <Droplet position={[2.2, -0.9, -0.3]} scale={0.22} />
        <Droplet position={[1.6, 1.5, -1.2]} scale={0.1} />
      </PointerRig>
      {!low && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
