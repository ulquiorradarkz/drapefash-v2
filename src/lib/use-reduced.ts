"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * prefers-reduced-motion, but false until the component has mounted, so the server render and the
 * first client render agree (the server cannot know the visitor's setting).
 */
export function useReduced(): boolean {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && !!reduce;
}
