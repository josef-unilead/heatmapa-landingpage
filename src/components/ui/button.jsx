import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
import { useCallback } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-500 ease-out cursor-pointer disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "glass-cta relative inline-flex items-center justify-center gap-2 rounded-full font-medium transition-transform duration-500 ease-out cursor-pointer disabled:pointer-events-none disabled:opacity-50",
        outline:
          "bg-white/5 backdrop-blur-md border border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20 hover:text-white",
        ghost:
          "text-neutral-500 hover:text-neutral-300 hover:bg-white/5",
      },
      size: {
        md: "px-5 py-2 text-sm",
        lg: "px-8 py-3 text-base font-semibold",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  const handlePointerDown = useCallback((e) => {
    try {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const x = (e.clientX - rect.left);
      const y = (e.clientY - rect.top);
      const r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = x + 'px';
      r.style.top = y + 'px';
      target.classList.add('ripple-container');
      target.appendChild(r);
      setTimeout(() => r.remove(), 650);
    } catch (err) {
      // ignore
    }
  }, []);

  return (
    <Comp onPointerDown={handlePointerDown} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
