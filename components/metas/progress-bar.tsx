export function ProgressBar({
  progresso,
  atrasado = false,
}: {
  /** 0-100 */
  progresso: number;
  atrasado?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, progresso));
  const barColor = atrasado
    ? "bg-rose-500"
    : clamped >= 100
      ? "bg-emerald-500"
      : "bg-sky-500";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
      <div
        className={`h-full rounded-full ${barColor} transition-[width]`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
