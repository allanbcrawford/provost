import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "../utils/cn";

export interface EntityRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}

export const EntityRow = forwardRef<HTMLDivElement, EntityRowProps>(
  ({ avatar, title, subtitle, meta, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-4 py-5 border-b border-provost-border-default",
          className,
        )}
        {...props}
      >
        {avatar ? (
          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full bg-provost-bg-secondary">
            {avatar}
          </div>
        ) : null}

        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-semibold tracking-[-0.36px] text-provost-text-primary truncate">
              {title}
            </h3>
          </div>
          {subtitle ? (
            <div className="mt-[14px] flex items-center gap-1 text-[14px] font-medium tracking-[-0.42px] text-provost-text-secondary overflow-hidden whitespace-nowrap">
              {subtitle}
            </div>
          ) : null}
        </div>

        {meta ? <div className="shrink-0 ml-4">{meta}</div> : null}
        {action ? <div className="shrink-0 ml-4">{action}</div> : null}
      </div>
    );
  },
);
EntityRow.displayName = "EntityRow";

export function EntityRowMetaItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("shrink-0", className)}>{children}</span>;
}

export function EntityRowMetaSeparator() {
  return <span className="mx-1 size-[3px] shrink-0 rounded-full bg-provost-neutral-700" />;
}
