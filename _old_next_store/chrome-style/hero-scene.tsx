"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

/*
 * The first screen as one 3D stage: liquid-chrome cloth at the back, the Drape wordmark as an extruded
 * holographic-chrome object, and the two models standing on a slowly turning glass platform in front.
 * `calm` (reduced motion): nothing moves by itself; the stage only leans toward the pointer.
 * `reverse` (right-to-left pages): the folds and the turn run the other way. The logo itself stays LTR.
 */

type Mode = { low: boolean; reverse: boolean; calm: boolean };

/* ------------------------------------------------------------------ shared helpers */

/** Pointer position, eased, shared by everything that leans toward the mouse. */
function useEasedPointer(speed = 2.5) {
  const p = useRef(new THREE.Vector2());
  useFrame((state, dt) => {
    p.current.x = THREE.MathUtils.damp(p.current.x, state.pointer.x, speed, dt);
    p.current.y = THREE.MathUtils.damp(p.current.y, state.pointer.y, speed, dt);
  });
  return p;
}

/**
 * Fit the stage to the viewport, in fractions of the visible height (H) and width (W):
 * the logo fills the upper band, the models stand in front of its lower half, the platform sits
 * above the buttons at the bottom of the screen. Phones (portrait) stack the logo above the models.
 */
const LOGO_H = 95 * (5.4 / 255); // letter height at scale 1
function useLayout() {
  const { width: W, height: H } = useThree((s) => s.viewport);
  const portrait = W < H * 0.9;
  const logoScale = Math.min((H * (portrait ? 0.2 : 0.38)) / LOGO_H, (W * 0.9) / 5.4);
  const stageScale = Math.min((H * (portrait ? 0.6 : 0.56)) / PERSON_H, (W * (portrait ? 1.2 : 0.9)) / 3.1);
  return {
    portrait,
    logoScale,
    // centre of the logo: 29% from the top on wide screens, 18% on phones
    logoY: H / 2 - H * (portrait ? 0.18 : 0.29),
    stageScale,
    // the platform (feet): 84% from the top on wide screens, 92% on phones
    stageY: H / 2 - H * (portrait ? 0.92 : 0.84),
  };
}

/* ------------------------------------------------------------------ the cloth */

function ChromeCloth({ low, reverse, calm }: Mode) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(14, 8.5, low ? 110 : 190, low ? 70 : 120), [low]);
  const rest = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);
  const last = useRef(new THREE.Vector2());
  const activity = useRef(0);
  const pointer = useEasedPointer();
  const dir = reverse ? -1 : 1;

  useFrame((state, dt) => {
    // The cloth only swells toward the pointer once it moves, and settles again when it rests.
    const moved = Math.abs(state.pointer.x - last.current.x) + Math.abs(state.pointer.y - last.current.y) > 0.0005;
    last.current.set(state.pointer.x, state.pointer.y);
    activity.current = THREE.MathUtils.damp(activity.current, moved ? 1 : 0, moved ? 4 : 0.6, dt);
    const px = pointer.current.x * 5.5;
    const py = pointer.current.y * 3.2;
    const t = calm ? 2 : state.clock.elapsedTime;
    const pos = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length; i += 3) {
      const x = rest[i];
      const y = rest[i + 1];
      // 0 where the cloth is pinned (top edge), 1 at the hem: the hem moves most.
      const hang = Math.min(1, Math.max(0, (4.25 - y) / 8.5));
      const pleats = Math.sin(x * 1.35 + dir * t * 0.55) * 0.42 + Math.sin(x * 2.9 - dir * t * 0.8 + y * 0.35) * 0.16;
      const fold = Math.sin(x * 2.1 + dir * t * 0.3 + y * 0.15);
      const creases = -fold * fold * 0.3;
      const sway = Math.sin(y * 0.9 + t * 0.4) * 0.18;
      const dx = x - px;
      const dy = y - py;
      const swell = Math.exp(-(dx * dx + dy * dy) * 0.45) * 0.55 * activity.current;
      pos[i + 2] = (pleats + creases + sway) * (0.3 + hang * 0.9) + swell;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  });

  return (
    <mesh geometry={geometry} rotation={[-0.28, 0, 0]} position={[0, 0.2, -2.6]}>
      <meshStandardMaterial color="#7d8798" metalness={1} roughness={0.12} envMapIntensity={0.34} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ the 3D wordmark */

// Same letter paths as the SVG wordmark (src/components/wordmark.tsx): outer outline first, holes after.
const LETTERS = [
  "M-6 -6L30 0L48 16L48 46L30 64L-6 70L6 54L6 10Z M18 12L27 12L36 21L36 43L27 52L18 52Z",
  "M52 14L66 20L66 28L80 18L98 15L90 30L77 31L66 41L66 58L57 70L56 24Z",
  "M100 25L124 17L141 26L141 59L148 70L131 64L127 59L112 66L98 58L98 46L110 37L129 35L129 30L121 28L104 35Z M110 50L129 45L129 54L114 58Z",
  "M150 14L164 20L178 15L195 24L195 52L180 61L164 58L164 76L155 89L154 24Z M164 30L178 27L183 33L183 46L176 50L164 48Z",
  "M201 31L215 17L236 17L247 30L247 43L214 43L216 51L226 55L249 50L240 64L217 67L201 56Z M213 30L234 30L236 35L213 35Z",
];
const LOGO_WIDTH = 5.4;
const UNIT = LOGO_WIDTH / 255; // letters span x -6..249

function parsePolys(d: string): THREE.Vector2[][] {
  return d
    .split("M")
    .filter((s) => s.trim())
    .map((sub) =>
      sub
        .replace(/Z/g, "")
        .split("L")
        .map((pair) => {
          const [x, y] = pair.trim().split(/\s+/).map(Number);
          // Centre on the letters and flip y (SVG grows down, 3D grows up).
          return new THREE.Vector2((x - 121.5) * UNIT, -(y - 41.5) * UNIT);
        }),
    );
}

function useLogoGeometry() {
  return useMemo(() => {
    const shapes = LETTERS.map((d) => {
      const [outer, ...holes] = parsePolys(d);
      const shape = new THREE.Shape(outer);
      for (const h of holes) shape.holes.push(new THREE.Path(h));
      return shape;
    });
    const g = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.035,
      bevelSegments: 4,
      curveSegments: 1,
    });
    g.translate(0, 0, -0.16);
    g.computeVertexNormals();
    return g;
  }, []);
}

function sparkleShape(r: number) {
  const k = r * 0.16;
  const s = new THREE.Shape();
  s.moveTo(0, r);
  s.quadraticCurveTo(k, k, r, 0);
  s.quadraticCurveTo(k, -k, 0, -r);
  s.quadraticCurveTo(-k, -k, -r, 0);
  s.quadraticCurveTo(-k, k, 0, r);
  return s;
}

function useSparkleGeometry() {
  return useMemo(() => {
    const g = new THREE.ExtrudeGeometry(sparkleShape(1), { depth: 0.18, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 6, curveSegments: 24 });
    g.center();
    return g;
  }, []);
}

/** Holographic chrome: mirror metal with a rainbow film on top, like the Y2K logos it quotes. */
function HoloChrome() {
  return (
    <meshPhysicalMaterial
      color="#f2f5fa"
      metalness={1}
      roughness={0.16}
      envMapIntensity={1.7}
      iridescence={0.85}
      iridescenceIOR={1.35}
      iridescenceThicknessRange={[180, 520]}
      clearcoat={1}
      clearcoatRoughness={0.05}
    />
  );
}

// The wordmark's own sparkles, in letter coordinates.
const LOGO_SPARKS = [
  { x: 258, y: 2, r: 12 },
  { x: -13, y: 64, r: 6 },
  { x: 124, y: -2, r: 5 },
];

function ChromeLogo({ calm, reverse }: { calm: boolean; reverse: boolean }) {
  const geometry = useLogoGeometry();
  const spark = useSparkleGeometry();
  const group = useRef<THREE.Group>(null);
  const sparks = useRef<(THREE.Mesh | null)[]>([]);
  const pointer = useEasedPointer(2);
  const layout = useLayout();
  const dir = reverse ? -1 : 1;

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = calm ? 0 : state.clock.elapsedTime;
    g.rotation.y = pointer.current.x * 0.35 + Math.sin(t * 0.4) * 0.06;
    g.rotation.x = -pointer.current.y * 0.18 + Math.sin(t * 0.33) * 0.03;
    g.position.y = layout.logoY + Math.sin(t * 0.6) * 0.04;
    sparks.current.forEach((m, i) => {
      if (!m) return;
      // Rock rather than spin, so a sparkle never turns edge-on to the camera.
      m.rotation.y = dir * Math.sin(t * (0.8 + i * 0.3) + i) * 0.55;
      const s = (LOGO_SPARKS[i].r * UNIT) * (1 + Math.sin(t * 2 + i * 2) * 0.12);
      m.scale.setScalar(s);
    });
  });

  return (
    <group ref={group} position={[0, layout.logoY, -0.9]} scale={layout.logoScale}>
      <mesh geometry={geometry}>
        <HoloChrome />
      </mesh>
      {LOGO_SPARKS.map((sp, i) => (
        <mesh
          key={i}
          ref={(m) => {
            sparks.current[i] = m;
          }}
          geometry={spark}
          position={[(sp.x - 121.5) * UNIT, -(sp.y - 41.5) * UNIT, 0.1]}
          scale={sp.r * UNIT}
        >
          <meshStandardMaterial color="#f4f8ff" metalness={1} roughness={0.04} envMapIntensity={1.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ the models on the glass stage */

const PERSON_H = 2.75;
const PERSON_W = PERSON_H * (853 / 1280);

function Person({ src, x, z, turn }: { src: string; x: number; z: number; turn: number }) {
  const texture = useTexture(src);
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);
  return (
    <mesh position={[x, PERSON_H / 2 + 0.035, z]} rotation={[0, turn, 0]} renderOrder={z > 0 ? 2 : 1}>
      <planeGeometry args={[PERSON_W, PERSON_H]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.02} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function GlassStage({ low, reverse, calm }: Mode) {
  const stage = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  const pointer = useEasedPointer(2.2);
  const layout = useLayout();
  const dir = reverse ? -1 : 1;

  useFrame((state, dt) => {
    const t = calm ? 0 : state.clock.elapsedTime;
    if (stage.current) {
      // The stage turns slowly to one side and back, like a shop-window turntable, and leans to the pointer.
      stage.current.rotation.y = dir * Math.sin(t * 0.35) * 0.38 + pointer.current.x * 0.3;
      stage.current.rotation.x = -pointer.current.y * 0.06 + 0.06;
    }
    // The studs around the rim keep spinning all the way round.
    if (ring.current && !calm) ring.current.rotation.y += dir * dt * 0.5;
  });

  const studs = useMemo(() => Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2), []);

  return (
    <group position={[0, layout.stageY, 0.6]} scale={layout.stageScale}>
      <group ref={stage}>
        {/* black-mirror disc: the models reflect in it */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.036, 0]}>
          <circleGeometry args={[1.48, 96]} />
          {low ? (
            <meshPhysicalMaterial color="#121620" metalness={0.9} roughness={0.15} clearcoat={1} envMapIntensity={1.2} />
          ) : (
            <MeshReflectorMaterial
              blur={[260, 80]}
              resolution={768}
              mixBlur={0.9}
              mixStrength={28}
              roughness={0.85}
              depthScale={1.1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color="#0d1018"
              metalness={0.6}
              mirror={0.8}
            />
          )}
        </mesh>
        {/* glass edge of the disc, catching the light */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.07, 96, 1, true]} />
          <meshPhysicalMaterial color="#dff1ff" metalness={0.2} roughness={0.05} transmission={0.6} thickness={0.2} iridescence={1} iridescenceIOR={1.3} clearcoat={1} envMapIntensity={1.4} side={THREE.DoubleSide} />
        </mesh>
        {/* chrome rim and a glowing ice-blue line under it */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.0, 0]}>
          <torusGeometry args={[1.5, 0.035, 16, 160]} />
          <meshStandardMaterial color="#eef2f8" metalness={1} roughness={0.06} envMapIntensity={1.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
          <torusGeometry args={[1.42, 0.012, 8, 160]} />
          <meshBasicMaterial color="#9fd8ff" toneMapped={false} />
        </mesh>
        <group ref={ring}>
          {studs.map((a, i) => (
            <mesh key={i} position={[Math.cos(a) * 1.5, 0.05, Math.sin(a) * 1.5]}>
              <sphereGeometry args={[i % 6 === 0 ? 0.045 : 0.022, 12, 12]} />
              <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.02} envMapIntensity={2} />
            </mesh>
          ))}
        </group>
        <ContactShadows position={[0, 0.04, 0]} scale={3.2} far={1.6} blur={2.6} opacity={0.55} color="#05060a" frames={calm ? 1 : Infinity} />
        <Suspense fallback={null}>
          <Person src="/hero/people/woman.webp" x={-0.52} z={0.12} turn={0.16} />
          <Person src="/hero/people/man.webp" x={0.55} z={-0.12} turn={-0.16} />
        </Suspense>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ floating chrome stars */

type Star = { pos: [number, number, number]; scale: number; speed: number; phase: number };
const STARS: Star[] = [
  { pos: [2.9, 1.1, 0.4], scale: 0.32, speed: 0.7, phase: 0 },
  { pos: [-3.0, -0.2, 0.2], scale: 0.22, speed: 0.9, phase: 1.7 },
  { pos: [-1.9, 1.45, -0.3], scale: 0.14, speed: 1.1, phase: 3.1 },
  { pos: [2.2, -1.0, 1.2], scale: 0.12, speed: 1.3, phase: 4.4 },
];
// Phones: keep the stars beside the models, clear of the logo band at the top.
const STARS_PORTRAIT: Star[] = [
  { pos: [0.95, -0.55, 0.6], scale: 0.16, speed: 0.7, phase: 0 },
  { pos: [-0.98, -0.05, 0.4], scale: 0.12, speed: 0.9, phase: 1.7 },
  { pos: [0.9, 0.55, 0.2], scale: 0.08, speed: 1.1, phase: 3.1 },
  { pos: [-0.85, -1.2, 0.9], scale: 0.07, speed: 1.3, phase: 4.4 },
];

function ChromeStars({ calm, reverse }: { calm: boolean; reverse: boolean }) {
  const geometry = useSparkleGeometry();
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const { width, height } = useThree((s) => s.viewport);
  const portrait = width < height * 0.9;
  const stars = portrait ? STARS_PORTRAIT : STARS;
  const spread = portrait ? 1 : Math.min(1, width / 6.7);
  const dir = reverse ? -1 : 1;
  useFrame((state) => {
    const t = calm ? 0 : state.clock.elapsedTime;
    stars.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.position.set(s.pos[0] * spread, s.pos[1] + Math.sin(t * s.speed + s.phase) * 0.12, s.pos[2]);
      m.rotation.y = dir * (t * s.speed * 0.6 + s.phase) + state.pointer.x * 0.6;
      m.rotation.x = Math.sin(t * 0.5 + s.phase) * 0.25 - state.pointer.y * 0.3;
    });
  });
  return (
    <>
      {stars.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={geometry}
          position={s.pos}
          scale={s.scale}
        >
          <meshStandardMaterial color="#eef2f8" metalness={1} roughness={0.05} envMapIntensity={1.6} />
        </mesh>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ canvas */

/** In calm mode the canvas only draws while the pointer moves (frameloop "demand"). */
function RedrawOnPointer() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let until = 0;
    let raf = 0;
    const tick = () => {
      invalidate();
      if (performance.now() < until) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const onMove = () => {
      // Keep drawing a moment after the last move so everything can settle.
      until = performance.now() + 1200;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    onMove();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [invalidate]);
  return null;
}

export default function HeroScene({
  active,
  low,
  reverse,
  calm,
  onReady,
}: {
  active: boolean;
  low: boolean;
  reverse: boolean;
  calm: boolean;
  onReady?: () => void;
}) {
  const mode = { low, reverse, calm };
  return (
    <Canvas
      dpr={[1, low ? 1.25 : 1.75]}
      frameloop={!active ? "never" : calm ? "demand" : "always"}
      camera={{ position: [0, 0.1, 6], fov: 35 }}
      gl={{ antialias: !low, alpha: false, powerPreference: "high-performance", stencil: false }}
      eventSource={typeof document !== "undefined" ? document.documentElement : undefined}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.85;
        requestAnimationFrame(() => onReady?.());
      }}
      aria-hidden
    >
      <color attach="background" args={["#07080d"]} />
      {/* The chrome reflects the brand colours: white, ice blue and violet light. */}
      <Environment files="/hero/studio.hdr" environmentIntensity={0.9} resolution={512}>
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[0, 4, 2]} scale={[7, 0.5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, -2.5, 3]} scale={[9, 0.25, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#9fd8ff" position={[-5, 0.5, 1]} rotation-y={Math.PI / 2} scale={[5, 2.5, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#a78bfa" position={[5, -1, 1]} rotation-y={-Math.PI / 2} scale={[5, 2.5, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#c9d1df" position={[0, -3, -2]} scale={3} />
        {/* Soft bands behind the camera: what the front faces of the logo reflect, so they read as mirror chrome. */}
        <Lightformer form="rect" intensity={1.4} color="#eef3fb" position={[0, 2.2, 7]} rotation-y={Math.PI} scale={[14, 1.6, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#9fd8ff" position={[-3, -0.6, 7]} rotation-y={Math.PI} scale={[8, 0.8, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#b9a6f5" position={[3, -1.6, 7]} rotation-y={Math.PI} scale={[8, 0.8, 1]} />
      </Environment>
      <ChromeCloth {...mode} />
      <ChromeLogo calm={calm} reverse={reverse} />
      <ChromeStars calm={calm} reverse={reverse} />
      <GlassStage {...mode} />
      {calm && <RedrawOnPointer />}
      {!low && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.32} luminanceThreshold={0.92} luminanceSmoothing={0.15} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
