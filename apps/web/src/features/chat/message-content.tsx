"use client";

import type { Content } from "@provost/schemas/threads";
import { Markdown } from "@provost/ui";
import Image from "next/image";

export type MessageContentProps = {
  // Server-side run history stores OpenAI's `ChatCompletionMessageParam`
  // shape, where content can be a plain string. The thread schema typing
  // promises a Content[], but at runtime we sometimes get a string (or
  // null/undefined for tool-only assistant turns). Normalize here so
  // every consumer renders consistently.
  parts: Content[] | string | null | undefined;
  markdown?: boolean;
};

function normalize(parts: MessageContentProps["parts"]): Content[] {
  if (!parts) return [];
  if (typeof parts === "string") {
    return parts.length > 0 ? [{ type: "text", text: parts, name: null }] : [];
  }
  if (!Array.isArray(parts)) return [];
  return parts;
}

export function MessageContent({ parts, markdown = true }: MessageContentProps) {
  const normalized = normalize(parts);
  return (
    <div className="flex flex-col gap-2">
      {normalized.map((part, index) => {
        const key = `${part.type}-${index}`;
        if (part.type === "text") {
          return markdown ? (
            <Markdown key={key}>{part.text}</Markdown>
          ) : (
            <p key={key} className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {part.text}
            </p>
          );
        }
        if (part.type === "image") {
          return (
            <Image
              key={key}
              src={part.image}
              alt={part.name ?? "image"}
              width={512}
              height={512}
              className="max-w-full rounded-lg border border-provost-border-subtle"
              unoptimized
            />
          );
        }
        if (part.type === "file") {
          return (
            <a
              key={key}
              href={part.file}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-provost-border-subtle bg-provost-bg-muted px-3 py-2 text-provost-text-primary text-sm hover:bg-provost-bg-muted/80"
            >
              <span className="truncate">{part.name}</span>
            </a>
          );
        }
        return null;
      })}
    </div>
  );
}
