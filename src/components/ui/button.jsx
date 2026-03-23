import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-orange-500 text-white hover:bg-orange-400 shadow-md shadow-orange-500/20 hover:shadow-orange-400/30 hover:-translate-y-0.5",
        outline:
          "border border-neutral-700 text-neutral-200 hover:border-orange-500/60 hover:text-white",
        ghost:
          "text-neutral-400 hover:text-orange-400 hover:bg-white/5",
      },
      size: {
        md: "px-5 py-2.5 text-sm",
        lg: "px-7 py-3.5 text-base",
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
