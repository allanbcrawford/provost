"use client";

import { Tabs, TabsList, TabsTrigger } from "@provost/ui";
import { DOCUMENT_TABS, type DocumentTab } from "./document-tabs-config";

type DocumentsTabsProps = {
  activeTab: DocumentTab;
  onTabChange: (tab: DocumentTab) => void;
};

export function DocumentsTabs({ activeTab, onTabChange }: DocumentsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as DocumentTab)}>
      <TabsList>
        {DOCUMENT_TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
