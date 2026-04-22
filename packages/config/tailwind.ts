import type { Config } from "tailwindcss";

export const preset: Config = {
  content: [],
  theme: {
    extend: {
      colors: {
        provost: {
          "text-primary": "oklch(20% 0.01 250)",
          "text-secondary": "oklch(40% 0.01 250)",
          "text-tertiary": "oklch(60% 0.01 250)",
          "bg-primary": "oklch(99% 0.005 250)",
          "bg-muted": "oklch(96% 0.005 250)",
          "border-subtle": "oklch(92% 0.005 250)",
          "border-strong": "oklch(80% 0.01 250)",
          "accent-blue": "oklch(50% 0.16 250)",
          "accent-red": "oklch(55% 0.18 25)",
        },
      },
      fontFamily: {
        "dm-serif": ["DM Serif Display", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};

export default preset;
