"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type HighlightsCardProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function HighlightsCard({ children, className = "", href, onClick }: HighlightsCardProps) {
  const baseStyles =
    "block overflow-hidden rounded-[12px] shadow-[0_4px_3px_rgba(0,0,0,0.1)] transition-transform hover:scale-[1.01] cursor-pointer h-full";

  if (href) {
    return (
      <Link href={href} className={`${baseStyles} ${className}`}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseStyles} ${className} text-left`}>
        {children}
      </button>
    );
  }

  return <div className={`${baseStyles} ${className}`}>{children}</div>;
}
