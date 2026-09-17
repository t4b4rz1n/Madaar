/**
 * Runtime tokens shared by React interactions.
 * Visual tokens live in index.css so Tailwind and the browser can consume them.
 */
export const motionTokens = {
  duration: {
    fast: 0.12,
    standard: 0.18,
    slow: 0.28,
  },
  easing: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.22, 1, 0.36, 1],
  },
} as const;
