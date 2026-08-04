import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        // Barvy pole (pozadí, text, placeholder, rámeček, focus) řeší index.css
        // mimo @layer – aby přežily i v prohlížeči, který Tailwind vrstvy zahodí.
        "w-full rounded-2xl px-4 py-3 text-sm outline-none transition-all duration-300 ease-in-out focus:ring-2 focus:ring-orange-400/15 resize-none",
        className
      )}
      {...props}
    />
  );
}
