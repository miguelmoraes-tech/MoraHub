import Link from "next/link";

const TONE_CLASS = {
  zinc: "text-zinc-100",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  copper: "text-copper-400",
} as const;

export interface SetorResumoStat {
  label: string;
  value: string;
  tone?: keyof typeof TONE_CLASS;
}

/**
 * Mesmo padrão visual dos blocos "RH"/"Marketing" já usados em
 * dashboard/financeiro/page.tsx (link para a tela detalhada + mini-grade de
 * números), extraído aqui como componente único para as 8 seções do
 * Dashboard Executivo em vez de repetir o JSX 8 vezes.
 */
export function SetorResumoCard({
  icon: Icon,
  titulo,
  href,
  stats,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  href: string;
  stats: SetorResumoStat[];
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Icon className="h-4 w-4 text-zinc-500" />
        {titulo}
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className={`text-xl font-semibold ${TONE_CLASS[stat.tone ?? "zinc"]}`}>
              {stat.value}
            </p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}
