import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        "bg-[var(--badge-bg)] text-[var(--badge-fg)]",
        className
      )}
      {...props}
    />
  );
}
