import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "icon";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--primary-bg)] text-[var(--primary-fg)] shadow-[var(--pressed-shadow)] hover:bg-[var(--primary-hover)]",
        variant === "secondary" &&
          "bg-[var(--surface-muted)] text-[var(--app-fg)] ring-1 ring-[var(--control-border)] shadow-[var(--secondary-shadow)] hover:bg-[var(--control-hover)]",
        variant === "ghost" && "text-[var(--app-fg)] hover:bg-[var(--ghost-hover)]",
        size === "md" && "h-12 px-5",
        size === "sm" && "h-9 px-3 text-sm",
        size === "icon" && "h-12 w-12",
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
