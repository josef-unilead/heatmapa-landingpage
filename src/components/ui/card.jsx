import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-800 bg-neutral-900 p-6",
        className
      )}
      {...props}
    />
  );
}
