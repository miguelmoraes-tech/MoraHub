import Link from "next/link";

/**
 * Rótulos de natureza dos números do Dashboard e dos Relatórios (sem hooks: serve a páginas de
 * servidor). "Real" vem de registros (pedidos, pagamentos, baixas de estoque, trabalhos medidos);
 * "Estimado" vem de parâmetros cadastrados (custos da Precificação, custo de máquina estimado).
 */
export function Natureza({ tipo }: { tipo: "real" | "estimado" }) {
  const classe =
    tipo === "real"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classe}`}>
      {tipo === "real" ? "Real" : "Estimado"}
    </span>
  );
}

const TONS = {
  zinc: "text-zinc-100",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  copper: "text-copper-400",
} as const;

export function Metrica({
  rotulo,
  valor,
  natureza,
  dica,
  tom = "zinc",
  href,
}: {
  rotulo: string;
  valor: string;
  natureza?: "real" | "estimado";
  dica?: string;
  tom?: keyof typeof TONS;
  href?: string;
}) {
  const corpo = (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-zinc-500">{rotulo}</span>
        {natureza && <Natureza tipo={natureza} />}
      </div>
      <p className={`text-xl font-semibold tabular-nums ${TONS[tom]}`}>{valor}</p>
      {dica && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{dica}</p>}
    </>
  );
  const base = "block rounded-xl border border-zinc-800 bg-zinc-900/50 p-4";
  return href ? (
    <Link href={href} className={`${base} transition-colors hover:border-zinc-700 hover:bg-zinc-900`}>
      {corpo}
    </Link>
  ) : (
    <div className={base}>{corpo}</div>
  );
}
