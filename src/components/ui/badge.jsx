import { cn } from "../../lib/utils";

export function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md px-3 py-1 text-xs font-medium tracking-wide text-neutral-400 uppercase",
        className
      )}
      {...props}
    />
  );
}
