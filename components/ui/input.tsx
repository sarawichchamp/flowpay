import { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 min-w-0 max-w-full w-full rounded-2xl border px-4 text-sm outline-none transition placeholder:text-slate-400",
        "border-[var(--control-border)] bg-[var(--control-bg)] shadow-[var(--control-shadow)] focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10",
        className
      )}
      {...props}
    />
  );
}
