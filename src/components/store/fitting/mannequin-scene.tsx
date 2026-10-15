"use client";

import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Decal, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { loadCutout, type Cutout } from "@/lib/garment-cutout";
import { loadFabric, type Fabric } from "@/lib/fitting/garment-texture";
import { MESH_HEM, styleFor, type GarmentStyle } from "@/lib/fitting/styles";
import type { Fit, Form, Slot } from "@/lib/picks";

/**
 * The fitting room's 3D mannequin: a realistic, faceless figure (Blender's Human Base Meshes, CC0, with the
 * face smoothed into a mannequin head) on a black stand in a quiet studio.
 *
 * Worn pieces are real garments: cloth simulations made in Blender on this same body (fitted, regular and
 * oversized tops, slim / straight / baggy trousers, skirts, dresses, jackets, puffers, shoes, hats, a bag),
 * with folds, sag and volume of their own. The product picture becomes the fabric: the garment is cut out of
 * the photo (a clothes-segmentation mask), filled to its edges and laid over the front of the draped piece;
 * the back takes the same fabric without the print. Rendering is on demand: frames are drawn only while
 * something moves.
 */

export type WornPiece = { slot: Slot; slug: string; src: string; title: string; category: string | null; fit: Fit };
export type Turn = { angle: number; target: number; dragging: boolean; idleSince: number };

const STAND = 0.03;
const INK = "#0a0a0a";
const ACCENT = "#7a2e31";

/** Each form's file, its mannequin height, and the folder of its garments. */
const MODELS: Record<Form, { url: string; height: number; garments: string }> = {
  men: { url: "/models/mannequin-male.glb", height: 1.82, garments: "/models/garments/male" },
  women: { url: "/models/mannequin-female.glb", height: 1.76, garments: "/models/garments/female" },
};

/** How the body file is placed in the scene; the garment files share its coordinates and get the same move. */
type Frame = { cx: number; minY: number; cz: number; s: number };

/* ------------------------------------------------------------------ geometry */

/** A plain float copy of a (possibly quantized) attribute. */
function toFloat(attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, size: number, map?: (v: number, c: number) => number): THREE.BufferAttribute {
  const out = new Float32Array(attr.count * size);
  for (let i = 0; i < attr.count; i++) {
    const v = [attr.getX(i), size > 1 ? attr.getY(i) : 0, size > 2 ? attr.getZ(i) : 0];
    for (let c = 0; c < size; c++) out[i * size + c] = map ? map(v[c], c) : v[c];
  }
  return new THREE.BufferAttribute(out, size);
}

function firstMesh(scene: THREE.Object3D): THREE.Mesh {
  scene.updateMatrixWorld(true);
  let found: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
  });
  if (!found) throw new Error("model has no mesh");
  return found;
}

/** The body as one float mesh, feet on the floor, centred, at mannequin height. */
function useBody(form: Form): { geometry: THREE.BufferGeometry; frame: Frame } {
  const { scene } = useGLTF(MODELS[form].url, false, true);
  const result = useMemo(() => {
    const mesh = firstMesh(scene);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", toFloat(mesh.geometry.attributes.position, 3));
    if (mesh.geometry.index) g.setIndex(mesh.geometry.index.clone());
    // Quantized files keep the de-quantizing scale and offset on the node: bake it in.
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const frame: Frame = { cx: (bb.min.x + bb.max.x) / 2, minY: bb.min.y, cz: (bb.min.z + bb.max.z) / 2, s: MODELS[form].height / (bb.max.y - bb.min.y) };
    g.translate(-frame.cx, -frame.minY, -frame.cz);
    g.scale(frame.s, frame.s, frame.s);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return { geometry: g, frame };
  }, [scene, form]);
  useEffect(() => () => result.geometry.dispose(), [result]);
  return result;
}

/**
 * A garment file as one float mesh in the body's place, with:
 * front (x, height) for laying the picture over it, rest (sleeve code, height before the drape) for cutting
 * sleeves and hems, ao (ambient occlusion baked in Blender).
 */
function useGarmentGeometry(form: Form, mesh: string, frame: Frame): THREE.BufferGeometry {
  const { scene } = useGLTF(`${MODELS[form].garments}/${mesh}.glb`, false, true);
  const geometry = useMemo(() => {
    const m = firstMesh(scene);
    const a = m.geometry.attributes;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", toFloat(a.position, 3));
    if (m.geometry.index) g.setIndex(m.geometry.index.clone());
    g.applyMatrix4(m.matrixWorld);
    g.translate(-frame.cx, -frame.minY, -frame.cz);
    g.scale(frame.s, frame.s, frame.s);
    // glTF stores texture coordinates upside down (v = 1 - height): turn them back.
    g.setAttribute("front", toFloat(a.uv, 2, (v, c) => (c === 1 ? 1 - v : v)));
    g.setAttribute("rest", a.uv1 ? toFloat(a.uv1, 2, (v, c) => (c === 1 ? 1 - v : v)) : new THREE.BufferAttribute(new Float32Array(a.position.count * 2), 2));
    g.setAttribute("ao", a.color ? toFloat(a.color, 1) : new THREE.BufferAttribute(new Float32Array(a.position.count).fill(1), 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [scene, frame]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/* ------------------------------------------------------------------ fabric */

/** Sleeve code in the files: 0 off the sleeves, 0.05 a bag strap, 0.1 at the armpit … 1 at the wrist. */
function sleeveLimit(sleeve: number): number {
  return sleeve < 0 ? 0.075 : 0.1 + 0.9 * sleeve + 0.002;
}

/** The part of the garment the picture is laid over: what this cut shows (layering does not count). */
function frontBox(g: THREE.BufferGeometry, style: GarmentStyle): THREE.Vector4 {
  const f = g.getAttribute("front");
  const r = g.getAttribute("rest");
  const limit = sleeveLimit(style.sleeve);
  let u0 = Infinity;
  let v0 = Infinity;
  let u1 = -Infinity;
  let v1 = -Infinity;
  for (let i = 0; i < f.count; i++) {
    const rx = r.getX(i);
    const ry = r.getY(i);
    if (rx > limit || ry < style.below || ry > style.above) continue;
    const u = f.getX(i);
    const v = f.getY(i);
    if (u < u0) u0 = u;
    if (u > u1) u1 = u;
    if (v < v0) v0 = v;
    if (v > v1) v1 = v;
  }
  if (!Number.isFinite(u0)) return new THREE.Vector4(0, 0, 1, 1);
  return new THREE.Vector4(u0, v0, Math.max(u1, u0 + 1e-3), Math.max(v1, v0 + 1e-3));
}

type GarmentUniforms = {
  uLook: { value: THREE.Texture | null };
  uBox: { value: THREE.Vector4 };
  uSleeve: { value: number };
  uBelow: { value: number };
  uAbove: { value: number };
  uBackPrint: { value: number };
  uReveal: { value: number };
};

const FINISH: Record<GarmentStyle["finish"], { roughness: number; sheen: number; clearcoat: number }> = {
  knit: { roughness: 0.86, sheen: 0.22, clearcoat: 0 },
  denim: { roughness: 0.92, sheen: 0.12, clearcoat: 0 },
  nylon: { roughness: 0.42, sheen: 0.1, clearcoat: 0.35 },
  leather: { roughness: 0.5, sheen: 0, clearcoat: 0.2 },
};

/**
 * Standard physical material, plus: cuts (sleeves, hems, layers hidden under others) by discarding, the
 * picture laid over the front and blurred to plain fabric towards the sides and back, baked occlusion,
 * the inside of the garment darker. Appears with a short dissolve.
 */
function garmentMaterial(finish: GarmentStyle["finish"]): THREE.MeshPhysicalMaterial {
  const f = FINISH[finish];
  const m = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: f.roughness,
    metalness: 0,
    sheen: f.sheen,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color("#ffffff"),
    clearcoat: f.clearcoat,
    clearcoatRoughness: 0.5,
    side: THREE.DoubleSide,
  });
  const uniforms: GarmentUniforms = {
    uLook: { value: null },
    uBox: { value: new THREE.Vector4(0, 0, 1, 1) },
    uSleeve: { value: 2 },
    uBelow: { value: -1 },
    uAbove: { value: 2 },
    uBackPrint: { value: 0 },
    uReveal: { value: 1 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 front;
attribute vec2 rest;
attribute float ao;
varying vec2 vFront;
varying vec2 vRest;
varying float vAo;
varying vec3 vObjN;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vFront = front;
vRest = rest;
vAo = ao;
vObjN = normal;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uLook;
uniform vec4 uBox;
uniform float uSleeve;
uniform float uBelow;
uniform float uAbove;
uniform float uBackPrint;
uniform float uReveal;
varying vec2 vFront;
varying vec2 vRest;
varying float vAo;
varying vec3 vObjN;`,
      )
      .replace(
        "#include <map_fragment>",
        `if (vRest.x > uSleeve || vRest.y < uBelow || vRest.y > uAbove) discard;
// dissolve in: a stable per-pixel threshold
if (uReveal < 1.0 && fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453) > uReveal) discard;
vec2 lookUv = clamp((vFront - uBox.xy) / (uBox.zw - uBox.xy), 0.004, 0.996);
vec3 sharpLook = texture2D(uLook, lookUv).rgb;
vec3 softLook = texture2D(uLook, lookUv, 6.0).rgb;
vec3 objN = normalize(vObjN);
float facing = smoothstep(0.08, 0.5, abs(objN.z));
float printW = facing * (objN.z >= 0.0 ? 1.0 : uBackPrint);
diffuseColor.rgb *= mix(softLook, sharpLook, printW) * mix(1.0, vAo, 0.85) * (gl_FrontFacing ? 1.0 : 0.68);`,
      );
  };
  m.customProgramCacheKey = () => "drape-garment";
  m.userData.uniforms = uniforms;
  return m;
}

function useFabric(slug: string, src: string, kind: GarmentStyle["fabric"]): Fabric | null {
  const [fabric, setFabric] = useState<Fabric | null>(null);
  useEffect(() => {
    let alive = true;
    setFabric(null);
    loadFabric(slug, src, kind)
      .then((f) => alive && setFabric(f))
      .catch(() => alive && setFabric(null));
    return () => {
      alive = false;
    };
  }, [slug, src, kind]);
  return fabric;
}

function useCanvasTexture(canvas: HTMLCanvasElement | null): THREE.CanvasTexture | null {
  const tex = useMemo(() => {
    if (!canvas) return null;
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  }, [canvas]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/* ------------------------------------------------------------------ garments */

/** A garment that fails to load (a missing model, a picture that won't decode) is left off; the rest stays. */
class Skip extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[fitting] garment skipped", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type Cover = { above: number };

/** A worn piece: picture first (it can decide the cut, e.g. how wide trousers are), then the draped model. */
function Garment({ piece, form, frame, cover, override, instant }: { piece: WornPiece; form: Form; frame: Frame; cover: Cover; override?: Partial<GarmentStyle>; instant: boolean }) {
  const pre = styleFor(piece.slot, piece.title, piece.category, piece.fit, null);
  const fabric = useFabric(piece.slug, piece.src, pre?.fabric ?? "top");
  if (!pre || !fabric) return null;
  const found = styleFor(piece.slot, piece.title, piece.category, piece.fit, fabric.legRatio) ?? pre;
  const style = { ...found, ...override };
  return (
    <Skip key={style.mesh}>
      <Suspense fallback={null}>
        <GarmentMesh style={style} fabric={fabric} form={form} frame={frame} cover={cover} instant={instant} />
      </Suspense>
    </Skip>
  );
}

function GarmentMesh({ style, fabric, form, frame, cover, instant }: { style: GarmentStyle; fabric: Fabric; form: Form; frame: Frame; cover: Cover; instant: boolean }) {
  const geometry = useGarmentGeometry(form, style.mesh, frame);
  const texture = useCanvasTexture(fabric.canvas);
  const material = useMemo(() => garmentMaterial(style.finish), [style.finish]);
  useEffect(() => () => material.dispose(), [material]);
  const box = useMemo(() => frontBox(geometry, style), [geometry, style]);
  const invalidate = useThree((s) => s.invalidate);
  const reveal = useRef(instant ? 1 : 0);

  const coverAbove = cover.above;
  useLayoutEffect(() => {
    const u = material.userData.uniforms as GarmentUniforms;
    u.uLook.value = texture;
    u.uBox.value = box;
    u.uSleeve.value = sleeveLimit(style.sleeve);
    u.uBelow.value = style.below;
    u.uAbove.value = Math.min(style.above, coverAbove);
    u.uBackPrint.value = style.backPrint ? 1 : 0;
    u.uReveal.value = reveal.current;
    invalidate();
  }, [material, texture, box, style, coverAbove, invalidate]);

  useFrame((_, delta) => {
    if (reveal.current >= 1) return;
    reveal.current = Math.min(1, reveal.current + delta * 2.2);
    (material.userData.uniforms as GarmentUniforms).uReveal.value = reveal.current;
    invalidate();
  });
  return <mesh geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ small head pieces (glasses, clips…) */

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

/** Glasses, earrings, hair clips: too small to model, printed onto the face like a decal. */
function HeadPrint({ piece, height }: { piece: WornPiece; height: number }) {
  const cut = useCutout(piece.src);
  const texture = useCanvasTexture(cut?.canvas ?? null);
  if (!cut || !texture) return null;
  const maxW = 0.13 * height;
  const maxH = 0.1 * height;
  const [w, h] = cut.aspect > maxW / maxH ? [maxW, maxW / cut.aspect] : [maxH * cut.aspect, maxH];
  return (
    <Decal position={[0, 0.935 * height, 0.045 * height]} rotation={[0, 0, 0]} scale={[w, h, 0.09 * height]} depthTest polygonOffsetFactor={-6}>
      <meshStandardMaterial map={texture} transparent alphaTest={0.3} roughness={0.6} metalness={0} depthWrite={false} />
    </Decal>
  );
}

/* ------------------------------------------------------------------ the mannequin and its stand */

function Figure({ form, worn, instant, onLoaded }: { form: Form; worn: WornPiece[]; instant: boolean; onLoaded?: (form: Form) => void }) {
  const { geometry, frame } = useBody(form);
  const height = MODELS[form].height;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    onLoaded?.(form);
    invalidate();
  }, [geometry, form, onLoaded, invalidate]);

  const bySlot = Object.fromEntries(worn.map((p) => [p.slot, p])) as Partial<Record<Slot, WornPiece>>;
  const pre = (slot: Slot) => {
    const p = bySlot[slot];
    return p ? styleFor(slot, p.title, p.category, p.fit, null) : null;
  };
  const top = pre("top");
  const outer = pre("outer");
  const head = bySlot.head;
  const headIsHat = !!pre("head");

  // Layering: what a layer above hides of the one below, and how the top changes under a jacket.
  const hems: number[] = [];
  if (top) hems.push(top.below > 0 ? top.below : (MESH_HEM[top.mesh] ?? 0.5));
  if (outer) hems.push(MESH_HEM[outer.mesh] ?? 0.5);
  const bottomCover: Cover = { above: hems.length ? Math.min(...hems) + 0.014 : 2 };
  const none: Cover = { above: 2 };
  const underJacket: Partial<GarmentStyle> | undefined = outer && outer.sleeve > 0 ? { mesh: "top_fitted", sleeve: -1 } : undefined;

  return (
    <group position={[0, STAND, 0]}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial color="#eeeeeb" roughness={0.44} metalness={0} clearcoat={0.35} clearcoatRoughness={0.4} />
        {head && !headIsHat && <HeadPrint key={`head-${head.slug}`} piece={head} height={height} />}
      </mesh>
      {worn.map((p) =>
        p.slot === "head" && !headIsHat ? null : (
          <Garment
            key={`${p.slot}-${p.slug}-${form}`}
            piece={p}
            form={form}
            frame={frame}
            cover={p.slot === "bottom" ? bottomCover : none}
            override={p.slot === "top" ? underJacket : undefined}
            instant={instant}
          />
        ),
      )}
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
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#ffffff", "#c9c9c4", 0.55]} />
      <directionalLight position={[2.4, 3.6, 3]} intensity={1.7} />
      <directionalLight position={[-3, 1.6, 2]} intensity={0.55} />
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
