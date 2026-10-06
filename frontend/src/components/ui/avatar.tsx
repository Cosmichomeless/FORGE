import { cn } from "@/lib/utils";

const palette = [
  "bg-indigo-600", "bg-violet-600", "bg-sky-700", "bg-teal-700", "bg-emerald-700",
  "bg-amber-700", "bg-orange-700", "bg-rose-700", "bg-fuchsia-700", "bg-cyan-700",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  return palette[hash % palette.length];
}

const sizes = { xs: "size-5 text-[0.625rem]", sm: "size-6 text-[0.6875rem]", md: "size-8 text-xs", lg: "size-10 text-sm" };

/** Decorative avatar: the person's name is always rendered next to it, so it is hidden from assistive technology. */
export function Avatar({ name, size = "md", className }: { name: string; size?: keyof typeof sizes; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", colorFor(name), sizes[size], className)}>
      {initials(name)}
    </span>
  );
}
