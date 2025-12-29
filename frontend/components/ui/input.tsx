"use client";

import { Eye, EyeOff, Search } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils/helpers";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: "default" | "search";
  hideToggle?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, type = "text", variant = "default", hideToggle, ...props }, ref) => {
    const isPassword = type === "password";
    const [showPassword, setShowPassword] = React.useState(false);
    const inputType = isPassword && showPassword ? "text" : type;

    return (
      <label className="flex w-full flex-col gap-2 text-sm font-medium text-foreground/80">
        {label}
        <div className="relative flex items-center">
          {variant === "search" && <Search className="absolute left-3 h-4 w-4 text-foreground/50" aria-hidden />}
          <input
            type={inputType}
            ref={ref}
            className={cn(
              "w-full rounded-xl border border-border/60 bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              variant === "search" && "pl-9",
              error && "border-red-400",
              className,
            )}
            {...props}
          />
          {isPassword && !hideToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-foreground/60"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {(error || helperText) && (
          <span className={cn("text-xs", error ? "text-red-500" : "text-foreground/60")}>{error ?? helperText}</span>
        )}
      </label>
    );
  },
);
Input.displayName = "Input";
