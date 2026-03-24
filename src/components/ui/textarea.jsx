import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-500 outline-none transition-colors focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30 resize-none",
        className
      )}
      {...props}
    />
  );
}
