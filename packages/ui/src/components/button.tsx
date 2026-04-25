import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "../utils/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] font-medium text-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-provost-border-default focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-provost-bg-inverse text-provost-text-inverse hover:opacity-90",
        secondary:
          "border border-provost-border-default bg-white text-provost-text-primary hover:bg-provost-bg-secondary",
        ghost: "text-provost-text-primary hover:bg-provost-bg-secondary",
        danger: "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-provost-border-default bg-transparent hover:bg-provost-bg-secondary",
        link: "text-provost-text-primary underline-offset-4 hover:underline",
        pill: "rounded-full border border-provost-border-default bg-white font-medium text-[15px] text-provost-text-primary tracking-[-0.6px] transition-colors hover:bg-provost-bg-secondary",
        "pill-ghost":
          "rounded-full bg-transparent text-provost-text-primary transition-colors hover:bg-provost-bg-secondary",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 py-2",
        lg: "h-10 px-6",
        icon: "size-9",
        pill: "h-[35px] min-w-[35px] px-4",
        "pill-icon": "h-[35px] w-[35px] p-0",
        "icon-round": "min-h-[38px] min-w-[38px] rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? "button")}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
