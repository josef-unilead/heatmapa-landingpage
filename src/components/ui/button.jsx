import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-500 ease-out cursor-pointer disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-orange-500/15 backdrop-blur-md border border-orange-500/40 text-orange-400 hover:bg-orange-500/25 hover:border-orange-500/60 shadow-lg shadow-orange-500/10 hover:-translate-y-0.5",
        outline:
          "bg-white/5 backdrop-blur-md border border-white/10 text-neutral-300 hover:bg-white/10 hover:border-white/20 hover:text-white",
        ghost:
          "text-neutral-500 hover:text-neutral-300 hover:bg-white/5",
      },
      size: {
        md: "px-5 py-2 text-sm",
        lg: "px-6 py-2.5 text-sm",
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
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
