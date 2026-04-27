"use client";

import { FeatureGate } from "@/components/feature-gate";

export default function LegacyPage() {
  return (
    <div className="p-8">
      <FeatureGate feature="legacy">
        <h1 className="font-dm-serif text-[36px] text-provost-text-primary">Legacy</h1>
        <p className="mt-2 text-[14px] text-provost-text-secondary">
          Values, stories, and history to pass down.
        </p>
      </FeatureGate>
    </div>
  );
}
