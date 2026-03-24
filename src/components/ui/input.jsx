import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors focus:border-white/25 focus:ring-1 focus:ring-white/10",
        className
      )}
      {...props}
    />
  );
}
