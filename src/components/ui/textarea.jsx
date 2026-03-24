import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/10 resize-none",
        className
      )}
      {...props}
    />
  );
}
