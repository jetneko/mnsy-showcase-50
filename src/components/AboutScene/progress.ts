import { createContext, useContext } from "react";

/**
 * A tiny ref-based progress bus. Scroll updates mutate `.current` on a shared
 * ref every frame; R3F meshes read it inside `useFrame` without triggering
 * React re-renders. React DOM consumers (Timeline) subscribe via
 * `onStageChange` for coarse-grained updates.
 */
export type ProgressRef = { current: number };

export const ProgressContext = createContext<ProgressRef>({ current: 0 });

export function useProgressRef(): ProgressRef {
  return useContext(ProgressContext);
}
