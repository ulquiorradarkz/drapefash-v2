"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReduced } from "@/lib/use-reduced";
import { cn } from "@/lib/utils";
import type { FieldColours } from "./shader-field-canvas";

const Canvas = dynamic(() => import("./shader-field-canvas"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * The hero's ground. Until (or unless) WebGL starts, the field is its darkest colour, flat, so the
 * page is complete without it. Under reduced motion the shader is drawn once and holds still.
 */
export function ShaderField({ colours, className }: { colours: FieldColours; className?: string }) {
  const reduce = useReduced();
  const [gl, setGl] = useState(false);
  useEffect(() => setGl(hasWebGL()), []);
  return (
    <div aria-hidden className={cn("absolute inset-0 overflow-hidden", className)} style={{ backgroundColor: "var(--paper)" }}>
      {gl && <Canvas colours={colours} still={reduce} />}
    </div>
  );
}
