import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "../utils/cn";

export const statusChipVariants = cva(
  "inline-flex h-[25px] items-center whitespace-nowrap rounded-full px-3 font-medium text-[13px] tracking-[-0.26px]",
  {
    variants: {
      variant: {
        new: "bg-provost-accent-blue text-white",
        observation: "bg-provost-observation-info-bg text-provost-accent-blue",
        "observation-danger": "bg-provost-observation-danger text-white",
        success: "bg-provost-status-success-bg text-provost-status-success",
        error: "bg-provost-status-error-bg text-provost-status-error",
        active: "bg-provost-status-active-bg text-provost-status-active-text",
        pending: "bg-provost-status-pending-bg text-provost-status-pending",
        inactive: "bg-provost-status-inactive-bg text-provost-status-inactive-text",
      },
    },
    defaultVariants: {
      variant: "new",
    },
  },
);

export interface StatusChipProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {}

export const StatusChip = forwardRef<HTMLSpanElement, StatusChipProps>(
  ({ className, variant, ...props }, ref) => (
    <span ref={ref} className={cn(statusChipVariants({ variant }), className)} {...props} />
  ),
);
StatusChip.displayName = "StatusChip";
