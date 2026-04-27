"use client";

import { FeatureGate } from "@/components/feature-gate";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <FeatureGate feature="settings">
        <h1 className="font-dm-serif text-[36px] text-provost-text-primary">Settings</h1>
        <p className="mt-2 text-[14px] text-provost-text-secondary">
          Account, preferences, and integrations.
        </p>
      </FeatureGate>
    </div>
  );
}
