import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        "border-[var(--border)] bg-[var(--surface)] shadow-[var(--panel-shadow)]",
        "backdrop-blur-[var(--surface-blur)]",
        className
      )}
      {...props}
    />
  );
}
