"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils/helpers";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow hover:brightness-110",
        destructive: "bg-red-600 text-white shadow hover:bg-red-700",
        outline: "border border-border bg-transparent text-foreground hover:bg-foreground/5",
        secondary: "bg-surface text-foreground shadow-sm hover:bg-surface/90",
        ghost: "text-foreground hover:bg-foreground/10",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
      isLoading: {
        true: "cursor-wait",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      isLoading: false,
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, disabled, loadingText, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
      const childContent = child.props.children ?? null;
      const content = (
        <span className="inline-flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          <span>{isLoading ? loadingText ?? "Loading" : childContent}</span>
        </span>
      );

      return React.cloneElement(
        child,
        {
          className: cn(buttonVariants({ variant, size, isLoading, className }), child.props.className),
          "aria-disabled": Boolean(disabled) || Boolean(isLoading) || undefined,
          ...props,
        },
        content,
      );
    }

    const fallbackContent = (
      <span className="inline-flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        <span>{isLoading ? loadingText ?? "Loading" : children}</span>
      </span>
    );

    return (
      <button
        className={cn(buttonVariants({ variant, size, isLoading, className }))}
        ref={ref}
        disabled={Boolean(disabled) || Boolean(isLoading)}
        {...props}
      >
        {fallbackContent}
      </button>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
