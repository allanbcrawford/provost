"use client";

import { Icon } from "@provost/ui";

export type ChatSuggestion = {
  prompt: string;
  label?: string;
};

const DEFAULT_SUGGESTIONS: ChatSuggestion[] = [
  { prompt: "Recommend a New Lesson" },
  { prompt: "Recommend a Family Fun Fact" },
  { prompt: "Give feedback on current lessons" },
];

export type ChatPanelEmptyStateProps = {
  firstName?: string;
  subtitle?: string;
  suggestions?: ChatSuggestion[];
  onSelectSuggestion: (prompt: string) => void;
};

export function ChatPanelEmptyState({
  firstName,
  subtitle,
  suggestions,
  onSelectSuggestion,
}: ChatPanelEmptyStateProps) {
  const name = firstName?.trim() || "there";
  const displaySuggestions =
    suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
  const welcomeText =
    subtitle ??
    "You have several upcoming meetings this week and a few unread messages from family and professionals. There is also a new liquidity observation that you may want to review.";

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-8 pb-4">
        <div className="mb-4">
          {/* Use img tag to reference public asset — keeps SVG a single file */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/provost-logo.svg"
            alt=""
            width={43}
            height={43}
            className="select-none"
          />
        </div>

        <h2 className="mb-2 font-dm-serif text-[32px] text-provost-text-primary tracking-[-0.32px]">
          Hi, {name}
        </h2>

        <p className="font-light text-[16px] text-provost-text-primary leading-relaxed">
          {welcomeText}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
        <div className="space-y-0">
          {displaySuggestions.map((suggestion, index) => (
            <div key={suggestion.prompt}>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-3 text-left transition-opacity hover:opacity-70"
                onClick={() => onSelectSuggestion(suggestion.prompt)}
              >
                <Icon name="asterisk" size={24} weight={200} />
                <span className="flex-1 font-medium text-[14px] text-provost-text-primary leading-[1.41] tracking-[-0.42px]">
                  {suggestion.label || suggestion.prompt}
                </span>
                <Icon name="arrow_forward_ios" size={12} weight={500} />
              </button>
              {index < displaySuggestions.length - 1 && (
                <div className="h-px bg-provost-neutral-100" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
