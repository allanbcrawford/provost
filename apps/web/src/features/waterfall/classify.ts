import type { AgreementCategory } from "./types";

/**
 * Map a document's `type` / `category` / `name` strings to a waterfall
 * `AgreementCategory`. Returns `null` for documents the engine doesn't
 * know how to incorporate (e.g. POAs, financial statements). The dev seed
 * uses a handful of values; matching is case-insensitive substring on the
 * combined blob so wording variation doesn't drop documents.
 */
export function classifyDocument(args: {
  type: string;
  category: string;
  name: string;
}): AgreementCategory | null {
  const blob = `${args.type} ${args.category} ${args.name}`.toLowerCase();
  if (blob.includes("revocable")) return "revocable_trust";
  if (blob.includes("trust")) return "irrevocable_trust";
  if (blob.includes("will")) return "will";
  return null;
}
