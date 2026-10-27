"use client";

import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";

export type FieldColours = [string, string, string];

/**
 * The moving field behind the monument: ShaderGradient's water plane on react-three-fiber, lit by
 * its own 3D lights (no environment map is fetched), with film grain. Loaded only in the browser.
 */
export default function ShaderFieldCanvas({ colours, still }: { colours: FieldColours; still: boolean }) {
  return (
    <ShaderGradientCanvas
      className="!absolute inset-0"
      style={{ position: "absolute", inset: 0 }}
      pixelDensity={1}
      fov={45}
      pointerEvents="none"
      lazyLoad
      powerPreference="low-power"
    >
      <ShaderGradient
        control="props"
        type="waterPlane"
        animate={still ? "off" : "on"}
        uTime={2.4}
        uSpeed={0.12}
        uStrength={2.6}
        uDensity={1.3}
        uFrequency={5.5}
        uAmplitude={0}
        positionX={0}
        positionY={0.4}
        positionZ={0}
        rotationX={50}
        rotationY={0}
        rotationZ={-60}
        color1={colours[0]}
        color2={colours[1]}
        color3={colours[2]}
        reflection={0.25}
        cAzimuthAngle={170}
        cPolarAngle={70}
        cDistance={4.4}
        cameraZoom={1}
        lightType="3d"
        brightness={0.95}
        grain="on"
        grainBlending={0.28}
        enableTransition={false}
        zoomOut={false}
        toggleAxis={false}
      />
    </ShaderGradientCanvas>
  );
}
