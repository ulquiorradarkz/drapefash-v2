"use client";

import { Fragment, Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Decal, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { loadCutout, type Cutout } from "@/lib/garment-cutout";
import type { Form, Slot } from "@/lib/picks";

/**
 * The fitting room's 3D mannequin: a realistic, faceless figure (from Blender's Human Base Meshes,
 * CC0, with the face smoothed into a mannequin head) on a black stand in a quiet studio.
 * Each worn piece is the product picture, cut out, projected onto the body like a print that
 * follows its curves (a decal): a top wraps chest and shoulders, trousers run down the legs.
 * Rendering is on demand: frames are drawn only while something moves.
 */

export type WornPiece = { slot: Slot; slug: string; src: string };
export type Turn = { angle: number; target: number; dragging: boolean; idleSince: number };

const STAND = 0.03;
const INK = "#0a0a0a";
const ACCENT = "#7a2e31";

/** Each form's file, its mannequin height, and where its feet stand (± x, in body heights). */
const MODELS: Record<Form, { url: string; height: number; feetX: number }> = {
  men: { url: "/models/mannequin-male.glb", height: 1.82, feetX: 0.124 },
  women: { url: "/models/mannequin-female.glb", height: 1.76, feetX: 0.09 },
};

/* ------------------------------------------------------------------ where each piece is projected */

type Projector = {
  /** Largest width and height the picture may take (it keeps its own proportions), in body heights. */
  maxW: number;
  maxH: number;
  /** Vertical placement in body heights: from a top edge, or around a centre. */
  align: "top" | "center";
  y: number;
  /** Projector centre in depth, and how deep it reaches: the whole body (front and back) or the front. */
  z: number;
  depth: number;
  /** Draw order from the skin out. */
  layer: number;
  /** How much taller than its picture the print may be drawn (trousers are pictured wider than legs). */
  stretch?: number;
};

/** Measured on the two models: collar 0.86, shoulders 0.81, waist 0.61, crotch 0.42, ankles 0.07 of the height. */
const PROJECTORS: Record<"head" | "top" | "outer" | "dress" | "bottom", Projector> = {
  head: { maxW: 0.13, maxH: 0.1, align: "center", y: 0.935, z: 0.045, depth: 0.09, layer: 2 },
  top: { maxW: 0.42, maxH: 0.32, align: "top", y: 0.865, z: 0, depth: 0.4, layer: 2 },
  outer: { maxW: 0.5, maxH: 0.43, align: "top", y: 0.872, z: 0, depth: 0.42, layer: 4 },
  dress: { maxW: 0.36, maxH: 0.6, align: "top", y: 0.862, z: 0, depth: 0.4, layer: 3, stretch: 1.15 },
  bottom: { maxW: 0.32, maxH: 0.6, align: "top", y: 0.625, z: 0, depth: 0.4, layer: 1, stretch: 1.35 },
  // (dress also stretches a little so a mini dress still reaches the thigh)
};
/** Feet: toes forward, x per form (MODELS). The hand hangs at x ≈ 0.25, y ≈ 0.45. */
const FEET = { y: 0.07, z: 0.0, maxW: 0.13, maxH: 0.17, depth: 0.28, tilt: -0.22 };
const HAND = { x: 0.255, y: 0.47, z: 0.06, max: 0.2 };

function fit(aspect: number, maxW: number, maxH: number): [number, number] {
  return aspect > maxW / maxH ? [maxW, maxW / aspect] : [maxH * aspect, maxH];
}

function useCutout(src: string): Cutout | null {
  const [cut, setCut] = useState<Cutout | null>(null);
  useEffect(() => {
    let alive = true;
    setCut(null);
    loadCutout(src)
      .then((c) => alive && setCut(c))
      .catch(() => alive && setCut(null));
    return () => {
      alive = false;
    };
  }, [src]);
  return cut;
}

function useTexture(cut: Cutout | null): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (!cut) return null;
    const t = new THREE.CanvasTexture(cut.canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }, [cut]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/** Fades a material in once (instant under reduced motion). */
function useFadeIn(instant: boolean) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(instant ? 1 : 0);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!mat.current) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + delta * 2.4);
      invalidate();
    }
    mat.current.opacity = t.current;
  });
  return mat;
}

function Print({ texture, position, rotation, scale, layer, instant }: { texture: THREE.Texture; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; layer: number; instant: boolean }) {
  const mat = useFadeIn(instant);
  return (
    <Decal position={position} rotation={rotation} scale={scale} depthTest polygonOffsetFactor={-2 - layer * 2} renderOrder={layer}>
      <meshStandardMaterial ref={mat} map={texture} transparent alphaTest={0.3} roughness={0.72} metalness={0} opacity={instant ? 1 : 0} depthWrite={false} />
    </Decal>
  );
}

/** A worn piece printed onto the body (head, top, jacket, dress, bottom). */
function BodyPrint({ piece, height, instant }: { piece: WornPiece & { slot: keyof typeof PROJECTORS }; height: number; instant: boolean }) {
  const cut = useCutout(piece.src);
  const texture = useTexture(cut);
  if (!cut || !texture) return null;
  const p = PROJECTORS[piece.slot];
  const [w, fitted] = fit(cut.aspect, p.maxW * height, p.maxH * height);
  const h = Math.min(p.maxH * height, fitted * (p.stretch ?? 1));
  const top = p.y * height;
  const y = p.align === "top" ? top - h / 2 : top;
  return <Print texture={texture} position={[0, y, p.z * height]} rotation={[0, 0, 0]} scale={[w, h, p.depth * height]} layer={p.layer} instant={instant} />;
}

/** A decal in one flat colour (the shoe's own colour under its picture). */
function ColorPrint({ color, position, rotation, scale, layer, instant }: { color: THREE.Color; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number]; layer: number; instant: boolean }) {
  const mat = useFadeIn(instant);
  return (
    <Decal position={position} rotation={rotation} scale={scale} depthTest polygonOffsetFactor={-2 - layer * 2} renderOrder={layer}>
      <meshStandardMaterial ref={mat} color={color} transparent roughness={0.6} metalness={0} opacity={instant ? 1 : 0} depthWrite={false} />
    </Decal>
  );
}

/**
 * Shoes: each foot is first covered in the shoe's main colour (so it reads as shod from every side),
 * then the shoe picture is printed over the front of the foot and ankle.
 */
function FeetPrint({ piece, height, feetX, instant }: { piece: WornPiece; height: number; feetX: number; instant: boolean }) {
  const cut = useCutout(piece.src);
  const texture = useTexture(cut);
  const color = useMemo(() => (cut ? new THREE.Color(`rgb(${cut.color[0]}, ${cut.color[1]}, ${cut.color[2]})`) : null), [cut]);
  if (!cut || !texture || !color) return null;
  const [w, h] = fit(cut.aspect, FEET.maxW * height, FEET.maxH * height);
  return (
    <>
      {[-1, 1].map((s) => (
        // A fragment, not a group: a decal must be a direct child of the body mesh.
        <Fragment key={s}>
          <ColorPrint
            color={color}
            position={[s * feetX * height, 0.035 * height, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.085 * height, 0.2 * height, 0.09 * height]}
            layer={2}
            instant={instant}
          />
          <Print
            texture={texture}
            position={[s * feetX * height, FEET.y * height, FEET.z * height]}
            rotation={[FEET.tilt, 0, 0]}
            scale={[w, h, FEET.depth * height]}
            layer={3}
            instant={instant}
          />
        </Fragment>
      ))}
    </>
  );
}

/** A bag or anything held: the cut-out hangs beside the right hand. */
function HandPiece({ piece, height, instant }: { piece: WornPiece; height: number; instant: boolean }) {
  const cut = useCutout(piece.src);
  const texture = useTexture(cut);
  const mat = useFadeIn(instant);
  if (!cut || !texture) return null;
  const [w, h] = fit(cut.aspect, HAND.max * height, HAND.max * height);
  return (
    <mesh position={[HAND.x * height + w * 0.3, HAND.y * height - h / 2, HAND.z * height]} rotation={[0, -0.28, 0.04]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial ref={mat} map={texture} transparent alphaTest={0.3} side={THREE.DoubleSide} roughness={0.75} opacity={instant ? 1 : 0} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ the mannequin and its stand */

/** A plain float copy of a (possibly quantized) attribute, so it can be transformed and projected onto. */
function toFloat(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, size: number): THREE.BufferAttribute {
  const out = new Float32Array(attr.count * size);
  for (let i = 0; i < attr.count; i++) {
    out[i * size] = attr.getX(i);
    if (size > 1) out[i * size + 1] = attr.getY(i);
    if (size > 2) out[i * size + 2] = attr.getZ(i);
  }
  return new THREE.BufferAttribute(out, size);
}

/** The body as one float mesh, feet on the floor, centred, at mannequin height. */
function useBody(form: Form): THREE.BufferGeometry {
  const { scene } = useGLTF(MODELS[form].url, false, true);
  const geometry = useMemo(() => {
    scene.updateMatrixWorld(true);
    let source: THREE.Mesh | null = null;
    scene.traverse((o) => {
      if (!source && (o as THREE.Mesh).isMesh) source = o as THREE.Mesh;
    });
    const mesh = source as THREE.Mesh | null;
    if (!mesh) throw new Error("mannequin model has no mesh");
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", toFloat(mesh.geometry.attributes.position, 3));
    if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
    // Quantized files keep the de-quantizing scale and offset on the node: bake it in.
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const s = MODELS[form].height / (bb.max.y - bb.min.y);
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.scale(s, s, s);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [scene, form]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function Figure({ form, worn, instant, onLoaded }: { form: Form; worn: WornPiece[]; instant: boolean; onLoaded?: (form: Form) => void }) {
  const geometry = useBody(form);
  const height = MODELS[form].height;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    onLoaded?.(form);
    invalidate();
  }, [geometry, form, onLoaded, invalidate]);

  const body = worn.filter((p): p is WornPiece & { slot: keyof typeof PROJECTORS } => p.slot in PROJECTORS);
  const feet = worn.find((p) => p.slot === "feet");
  const hand = worn.find((p) => p.slot === "hand");
  return (
    <group position={[0, STAND, 0]}>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial color="#eeeeeb" roughness={0.44} metalness={0} clearcoat={0.35} clearcoatRoughness={0.4} />
        {body.map((p) => (
          <BodyPrint key={`${p.slot}-${p.slug}-${form}`} piece={p} height={height} instant={instant} />
        ))}
        {feet && <FeetPrint key={`feet-${feet.slug}-${form}`} piece={feet} height={height} feetX={MODELS[form].feetX} instant={instant} />}
      </mesh>
      {hand && <HandPiece key={`hand-${hand.slug}-${form}`} piece={hand} height={height} instant={instant} />}
    </group>
  );
}

function Stand() {
  return (
    <group>
      <mesh position={[0, STAND / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.42, 0.43, STAND, 72]} />
        <meshPhysicalMaterial color={INK} roughness={0.18} metalness={0.1} clearcoat={1} clearcoatRoughness={0.12} />
      </mesh>
      {/* the one touch of colour: a thin oxblood line round the base */}
      <mesh position={[0, STAND + 0.0006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.398, 0.406, 96]} />
        <meshBasicMaterial color={ACCENT} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A quiet photo studio: pale floor, a slightly darker wall. */
function Studio() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[8, 64]} />
        <meshStandardMaterial color="#ecece9" roughness={1} />
      </mesh>
      <mesh position={[0, 3, -2.2]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#dededa" roughness={1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ turning */

function Turntable({ turn, auto, children }: { turn: MutableRefObject<Turn>; auto: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    const t = turn.current;
    if (auto && !t.dragging && performance.now() - t.idleSince > 2600) t.target += delta * 0.3;
    const diff = t.target - t.angle;
    t.angle += diff * Math.min(1, delta * 7);
    if (group.current) group.current.rotation.y = t.angle;
    if (auto || Math.abs(diff) > 0.0005) invalidate();
  });
  return <group ref={group}>{children}</group>;
}

export default function MannequinScene({
  form,
  worn,
  turn,
  reducedMotion,
  onReady,
  onLoaded,
}: {
  form: Form;
  worn: WornPiece[];
  turn: MutableRefObject<Turn>;
  reducedMotion: boolean;
  /** Called once the canvas exists, with a function that redraws it (for turning from outside). */
  onReady?: (redraw: () => void) => void;
  /** Called when the mannequin for a form has loaded. */
  onLoaded?: (form: Form) => void;
}) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      flat
      camera={{ position: [0, 1.0, 3.75], fov: 31, near: 0.1, far: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ camera, invalidate }) => {
        camera.lookAt(0, 0.94, 0);
        onReady?.(() => invalidate());
      }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#ffffff", "#c9c9c4", 0.55]} />
      <directionalLight position={[2.4, 3.6, 3]} intensity={1.6} />
      <directionalLight position={[-3, 1.6, 2]} intensity={0.5} />
      <directionalLight position={[0.5, 2.6, -3]} intensity={1.1} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 3, 3]} scale={[5, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-4, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[4, 1.5, -1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 2, 1]} />
      </Environment>
      <Studio />
      <Turntable turn={turn} auto={!reducedMotion}>
        <Stand />
        <Suspense fallback={null}>
          <Figure form={form} worn={worn} instant={reducedMotion} onLoaded={onLoaded} />
        </Suspense>
      </Turntable>
      <ContactShadows position={[0, 0.0005, 0]} opacity={0.5} scale={2.8} blur={2.4} far={1.6} color={INK} />
    </Canvas>
  );
}
