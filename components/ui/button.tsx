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
        variant === "primary" && "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20 hover:bg-teal-400",
        variant === "secondary" && "bg-white/70 text-slate-950 ring-1 ring-slate-200 hover:bg-white dark:bg-white/10 dark:text-white dark:ring-white/10",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
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
