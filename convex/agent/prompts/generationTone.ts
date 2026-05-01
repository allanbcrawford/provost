// Generation-tone fragment. Wraps the canonical tone-block from
// `convex/lib/generationTone.ts` in a tagged section so the system prompt
// stays self-documenting and easy to drop when DOB is missing.

import {
  type Generation,
  ageFromDateOfBirth,
  getGenerationTone,
  getGenerationToneBlock,
} from "../../lib/generationTone";

export function generationToneFragment(args: {
  age?: number | null;
  dateOfBirth?: string | null;
}): string {
  const age =
    args.age !== undefined && args.age !== null ? args.age : ageFromDateOfBirth(args.dateOfBirth);
  const generation: Generation = getGenerationTone({ age });
  const block = getGenerationToneBlock(generation);
  return `<generation_tone band="${generation}">\n${block}\n</generation_tone>`;
}
