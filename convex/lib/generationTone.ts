// Canonical Gen 1 / Gen 2 / Gen 3 tone-calibration spec.
//
// Spec source (verbatim):
//   - docs/Concepts/Generation Tone.md
//   - docs/Product/lesson-modalities.md
//
// Single source of truth for generation-keyed tone instructions injected into
// chat system prompts (convex/agent/prompts.ts) and lesson generation
// (convex/agent/tools/summarizeLesson.ts).
//
// Bands:
//   gen1: 60+   formal, comprehensive
//   gen2: 35–55 professional, practical
//   gen3: 16–30 relatable, visual-first
//
// Edge cases:
//   31–34 → gen2  (closer-band: gen2 is 35–55, gen3 ends at 30; tie/near-tie
//                  resolved upward to gen2 per neutral-professional default)
//   56–59 → gen2  (gen2 is 35–55, gen1 starts at 60; falls to gen2)
//   <16   → gen3  (nearest band)
//   >100  → gen1  (nearest band)
//   no DOB / null → gen2  (neutral professional fallback)
//
// Smoke test (manual):
//   1. In the dashboard, open chat as a Gen 3 member (age 24) and ask:
//      "Explain Dynasty Trusts."
//   2. In another tab, open chat as a Gen 1 member (age 70) and ask the same.
//   3. Visually inspect the two replies — Gen 3 should be punchy, visual,
//      and use "your family's money"-style framing; Gen 1 should be formal,
//      cite specific provisions, and lead with strategic context.
//   4. Repeat by triggering the `summarize_lesson` tool for the same lesson
//      while logged in as each member; the bullet copy should differ.

export type Generation = "gen1" | "gen2" | "gen3";

export function getGenerationTone(args: { age?: number | null }): Generation {
  const age = args.age;
  if (age === null || age === undefined || Number.isNaN(age)) return "gen2";
  if (age >= 60) return "gen1";
  if (age >= 35) return "gen2";
  if (age >= 16) return "gen3";
  // <16: nearest band is gen3
  return "gen3";
}

export function ageFromDateOfBirth(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export const GENERATION_TONE_EXAMPLES: Record<Generation, string> = {
  gen1: "A detailed analysis of your Dynasty Trust provisions",
  gen2: "Understanding your family's estate tax obligations",
  gen3: "What happens to your family's money?",
};

const GEN1_BLOCK = `You are addressing a Gen 1 member (age 60+).
- Use formal, comprehensive language. Assume sophisticated financial literacy.
- Lead with strategic context, fiduciary duty, and long-term family implications.
- Cite specific provisions, statutes, or instrument sections where relevant.
- Use longer, fully-formed sentences; favor patient, thorough pacing.
- Avoid casual phrasing, slang, emoji, or visual-first metaphors.
- Example framing: "${GENERATION_TONE_EXAMPLES.gen1}"`;

const GEN2_BLOCK = `You are addressing a Gen 2 member (age 35–55).
- Use professional, practical language. Assume working financial literacy.
- Lead with what decisions or obligations are in front of them this quarter or year.
- Define technical terms briefly on first use; do not over-explain basics.
- Balance strategic context with concrete next steps and trade-offs.
- Use clear, moderately-paced prose; minimal visual metaphors unless they aid clarity.
- Example framing: "${GENERATION_TONE_EXAMPLES.gen2}"`;

const GEN3_BLOCK = `You are addressing a Gen 3 member (age 16–30).
- Use relatable, visual-first language. Assume limited prior estate-planning exposure.
- Lead with the human impact: what it means for them and the people they care about.
- Prefer short, punchy sentences and concrete scenarios over abstract doctrine.
- Define technical terms inline with everyday analogies; favor diagrams or step lists when possible.
- Stay warm and direct; light contemporary references are fine, slang is not.
- Example framing: "${GENERATION_TONE_EXAMPLES.gen3}"`;

export function getGenerationToneBlock(g: Generation): string {
  switch (g) {
    case "gen1":
      return GEN1_BLOCK;
    case "gen2":
      return GEN2_BLOCK;
    case "gen3":
      return GEN3_BLOCK;
  }
}
