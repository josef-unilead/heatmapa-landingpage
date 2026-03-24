import { cn } from "../../lib/utils";

export function Checkbox({ className, label, ...props }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 group">
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className={cn(
            "peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-white/15 bg-white/5 transition-colors checked:border-white/30 checked:bg-white/15 focus:ring-1 focus:ring-white/10 outline-none",
            className
          )}
          {...props}
        />
        <svg
          className="pointer-events-none absolute h-3 w-3 text-neutral-300 opacity-0 peer-checked:opacity-100 transition-opacity"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M11.5 4L5.5 10L2.5 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {label && (
        <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">
          {label}
        </span>
      )}
    </label>
  );
}
