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
          "flex items-center gap-4 border-provost-border-default border-b py-5",
          className,
        )}
        {...props}
      >
        {avatar ? (
          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full bg-provost-bg-secondary">
            {avatar}
          </div>
        ) : null}

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-[18px] text-provost-text-primary tracking-[-0.36px]">
              {title}
            </h3>
          </div>
          {subtitle ? (
            <div className="mt-[14px] flex items-center gap-1 overflow-hidden whitespace-nowrap font-medium text-[14px] text-provost-text-secondary tracking-[-0.42px]">
              {subtitle}
            </div>
          ) : null}
        </div>

        {meta ? <div className="ml-4 shrink-0">{meta}</div> : null}
        {action ? <div className="ml-4 shrink-0">{action}</div> : null}
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
