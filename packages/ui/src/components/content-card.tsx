"use client";

import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type ThumbnailImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  unoptimized?: boolean;
};

export function ThumbnailImage({
  src,
  alt,
  width = 204,
  height = 94,
  className = "",
  unoptimized = false,
}: ThumbnailImageProps) {
  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden bg-gray-100 ${className}`}
      style={{ width, height }}
      data-unoptimized={unoptimized ? "true" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

type DotSeparatorProps = {
  className?: string;
};

export function DotSeparator({ className = "" }: DotSeparatorProps) {
  return (
    <span className={`size-[3px] shrink-0 rounded-full bg-provost-neutral-600 ${className}`} />
  );
}

type ContentCardProps = {
  thumbnail?: ReactNode;
  thumbnailSrc?: string;
  thumbnailAlt?: string;
  thumbnailUnoptimized?: boolean;
  title: string;
  description?: string;
  metadata: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
  className?: string;
};

export function ContentCard({
  thumbnail,
  thumbnailSrc,
  thumbnailAlt,
  thumbnailUnoptimized,
  title,
  description,
  metadata,
  actions,
  extra,
  className,
}: ContentCardProps) {
  return (
    <div className={cn("flex items-start gap-6 py-6", className)}>
      {thumbnail ||
        (thumbnailSrc && (
          <ThumbnailImage
            src={thumbnailSrc}
            alt={thumbnailAlt || title}
            unoptimized={thumbnailUnoptimized}
          />
        ))}

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-[22px] leading-[1.26] tracking-[-0.88px]">
          {title}
        </h3>
        {description && (
          <p className="mt-2 truncate font-light text-[16px] text-provost-text-secondary leading-[1.26] tracking-[-0.48px]">
            {description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 text-[14px] text-provost-neutral-600 tracking-[-0.42px]">
          {metadata}
        </div>

        {extra}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

type ContentMetadataProps = {
  icon?: ReactNode;
  label: string;
  className?: string;
};

export function ContentMetadata({ icon, label, className }: ContentMetadataProps) {
  return (
    <>
      {icon}
      <span className={cn("font-light", className)}>{label}</span>
    </>
  );
}

type ProgressBarProps = {
  progress: number;
  color?: string;
  className?: string;
};

export function ProgressBar({ progress, color = "#242424", className }: ProgressBarProps) {
  return (
    <div className={cn("h-1 w-[60px] rounded-full bg-provost-border-default", className)}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

type BadgeProps = {
  children: ReactNode;
  variant?: "new" | "observation" | "observation-danger";
  className?: string;
};

const badgeStyles = {
  new: "bg-provost-accent-blue text-white",
  observation: "bg-provost-observation-info-bg text-provost-accent-blue",
  "observation-danger": "bg-provost-observation-danger text-white",
};

export function Badge({ children, variant = "new", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-4 py-1 font-medium text-[14px]",
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
