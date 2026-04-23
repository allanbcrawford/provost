import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "../utils/cn";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-9 w-full min-w-0 rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1 text-sm text-provost-text-primary shadow-xs outline-none transition-[color,box-shadow]",
          "placeholder:text-provost-text-secondary",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-provost-border-default focus-visible:ring-2 focus-visible:ring-provost-border-default/30",
          "aria-invalid:border-red-500 aria-invalid:ring-red-500/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
