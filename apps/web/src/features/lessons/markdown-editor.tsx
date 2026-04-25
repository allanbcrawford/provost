"use client";

// Split-pane Markdown editor for the in-browser lesson curation flow.
// Left: textarea source. Right: live preview via @provost/ui Markdown.
// State is fully controlled — parent owns `value` and `onChange` so the
// page can plumb the draft body into usePageContext for the chat agent.

import { Markdown } from "@provost/ui";

export function MarkdownEditor({
  value,
  onChange,
  rows = 24,
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col">
        <label
          className="mb-1.5 font-semibold text-[11px] text-provost-text-secondary uppercase tracking-[0.5px]"
          htmlFor="markdown-editor-source"
        >
          Markdown source
        </label>
        <textarea
          id="markdown-editor-source"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          spellCheck
          className="flex-1 rounded-md border border-provost-border-default bg-white p-3 font-mono text-[13px] text-provost-text-primary leading-relaxed outline-none focus:border-provost-text-primary focus:ring-1 focus:ring-provost-text-primary"
          placeholder="# Lesson title&#10;&#10;Write the article body in Markdown…"
        />
      </div>
      <div className="flex flex-col">
        <p className="mb-1.5 font-semibold text-[11px] text-provost-text-secondary uppercase tracking-[0.5px]">
          Live preview
        </p>
        <div className="flex-1 overflow-auto rounded-md border border-provost-border-default bg-provost-bg-primary p-4">
          {value.trim().length > 0 ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-[13px] text-provost-text-secondary italic">
              Preview appears here as you type.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
