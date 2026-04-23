import type { Config } from "tailwindcss";

/**
 * Tailwind 4 is CSS-first: tokens live in `@provost/ui/styles.css` under
 * `@theme inline`. This preset exists so TS consumers have a typed handle
 * and can pass `content` globs at the app level.
 */
export const preset: Config = {
  content: [],
  theme: {
    extend: {},
  },
};

export default preset;
