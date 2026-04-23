"use client";

export type LibraryTab = "sources" | "groups" | "collections";

const TABS: { key: LibraryTab; label: string }[] = [
  { key: "sources", label: "Sources" },
  { key: "groups", label: "Groups" },
  { key: "collections", label: "Collections" },
];

type Props = {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
  counts: { sources: number; groups: number; collections: number };
};

export function LibraryTabs({ activeTab, onTabChange, counts }: Props) {
  return (
    <div className="border-provost-border-default border-b">
      <div className="flex gap-8">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className="relative cursor-pointer pb-4"
            >
              <span
                className={`text-[15px] tracking-[-0.6px] ${
                  isActive ? "text-provost-text-primary" : "text-provost-text-secondary"
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`ml-2 font-semibold text-[15px] tracking-[-0.6px] ${
                  isActive ? "text-provost-text-primary" : "text-provost-text-secondary"
                }`}
              >
                {counts[tab.key]}
              </span>
              {isActive && (
                <span className="absolute right-0 bottom-0 left-0 h-[2px] bg-provost-text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
