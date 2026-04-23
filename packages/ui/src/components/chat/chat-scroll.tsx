"use client";

import { type ReactNode, useEffect, useRef } from "react";

import { cn } from "../../utils/cn";

export interface ChatScrollProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export function ChatScroll({
  children,
  footer,
  className,
  contentClassName,
  footerClassName,
}: ChatScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div className={cn("relative flex h-full min-h-0 flex-col", className)}>
      <div ref={scrollRef} className={cn("min-h-0 flex-1 overflow-y-auto", contentClassName)}>
        {children}
        <div ref={bottomRef} />
      </div>
      {footer && (
        <div
          className={cn(
            "sticky bottom-0 shrink-0 border-provost-border-subtle border-t bg-white",
            footerClassName,
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
