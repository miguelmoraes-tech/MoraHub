const TONES = {
  zinc: "text-zinc-100",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  copper: "text-copper-400",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "zinc",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className={`text-2xl font-semibold ${TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
