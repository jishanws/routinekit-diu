// Shared motion and animation tokens for RoutineKit redesign
export const TRANSITIONS = {
  // Spring curve for modals, popovers, drawers, day-strip pill
  spring: {
    type: "spring" as const,
    damping: 26,
    stiffness: 320,
    mass: 0.8,
  },
  // Snappy ease-out for hover states and cards
  snappy: {
    duration: 0.18,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  // Smooth view cross-fade
  crossFade: {
    duration: 0.22,
    ease: "easeInOut" as const,
  },
};
