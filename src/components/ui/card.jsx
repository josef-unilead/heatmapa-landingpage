import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "glass glass-card rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] transition-transform duration-500 ease-out",
        className
      )}
      {...props}
    />
  );
}
