const TONES = {
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  zinc: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  copper: "bg-copper-500/10 text-copper-400 border-copper-500/20",
} as const;

export type ChipTone = keyof typeof TONES;

export function StatusChip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
