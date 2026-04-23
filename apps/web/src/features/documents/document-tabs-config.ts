export type DocumentTab = "all" | "estate-plan" | "financial";

export type TabConfig = {
  id: DocumentTab;
  label: string;
};

export const DOCUMENT_TABS: TabConfig[] = [
  { id: "all", label: "All documents" },
  { id: "estate-plan", label: "Estate Plan Documents" },
  { id: "financial", label: "Financial statements" },
];

const ESTATE_CATEGORIES = new Set(["estate_plan", "Transformational", "Advanced", "Transactional"]);
const FINANCIAL_CATEGORIES = new Set(["financial_statements", "financial"]);

export function matchesTab(category: string, tab: DocumentTab): boolean {
  if (tab === "all") return true;
  if (tab === "estate-plan") return ESTATE_CATEGORIES.has(category);
  if (tab === "financial") return FINANCIAL_CATEGORIES.has(category);
  return false;
}
