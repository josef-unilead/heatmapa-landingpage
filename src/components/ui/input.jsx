import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "w-full rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none transition-all duration-300 ease-in-out focus:border-orange-400/40 focus:ring-2 focus:ring-orange-400/15",
        className
      )}
      {...props}
    />
  );
}
