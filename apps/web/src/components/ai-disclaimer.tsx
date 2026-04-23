"use client";

import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import { api } from "../../../../convex/_generated/api";

export function AiDisclaimer({ kind = "default" }: { kind?: "default" | "legal" | "financial" }) {
  const family = useSelectedFamily();
  const preferences = useQuery(
    api.compliance.getDisclaimerPreferences,
    family ? { familyId: family._id } : "skip",
  );

  if (preferences) {
    if (kind === "legal" && !preferences["disclaimers.show_legal"]) return null;
    if (kind === "financial" && !preferences["disclaimers.show_financial"]) return null;
  }

  const text = {
    default: "AI-generated content. Educational, not professional advice.",
    legal: "AI-drafted legal content. Not a substitute for licensed attorney review.",
    financial:
      "AI-generated financial analysis. Not investment advice. Consult a licensed advisor.",
  }[kind];
  return (
    <div className="mt-3 border-provost-border-strong border-l-2 bg-provost-bg-muted px-3 py-2 text-[11px] text-provost-text-tertiary leading-snug">
      <span className="font-semibold">Disclaimer:</span> {text}
    </div>
  );
}
