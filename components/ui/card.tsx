import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}
