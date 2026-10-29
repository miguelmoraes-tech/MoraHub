import Link from "next/link";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { PERIODO_MAXIMO_DIAS, type AtalhoPeriodo, type Periodo } from "@/lib/impressao-3d/painel";

// Cópia de CLASSE_CAMPO (campos.tsx é "use client": uma constante dele não serve a página de servidor).
const CLASSE_CAMPO =
  "rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500";

/**
 * Seletor de período por formulário GET (sem estado no cliente): a página lê `de` e `ate` da URL,
 * valida no servidor e refaz a consulta. `extras` mantém os outros filtros (aba, agrupamento...).
 */
export function SeletorPeriodo({
  baseHref,
  periodo,
  atalhos,
  extras = {},
  erro,
}: {
  baseHref: string;
  periodo: Periodo;
  atalhos: AtalhoPeriodo[];
  extras?: Record<string, string>;
  erro?: string | null;
}) {
  const href = (a: Periodo) => {
    const q = new URLSearchParams({ ...extras, de: a.de, ate: a.ate });
    return `${baseHref}?${q.toString()}`;
  };
  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <form method="get" action={baseHref} className="flex flex-wrap items-end gap-3">
        {Object.entries(extras).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-400">De</span>
          <input type="date" name="de" defaultValue={periodo.de} required className={CLASSE_CAMPO} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-400">Até</span>
          <input type="date" name="ate" defaultValue={periodo.ate} required className={CLASSE_CAMPO} />
        </label>
        <button
          type="submit"
          className="rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500"
        >
          Aplicar
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        {atalhos.map((a) => {
          const ativo = a.de === periodo.de && a.ate === periodo.ate;
          return (
            <Link
              key={a.id}
              href={href(a)}
              aria-current={ativo ? "true" : undefined}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                ativo
                  ? "border-copper-500/50 bg-copper-600/15 text-copper-300"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              {a.rotulo}
            </Link>
          );
        })}
        <span className="ml-auto text-[11px] text-zinc-600">
          {formatDataIso(periodo.de)} a {formatDataIso(periodo.ate)} · máximo de {PERIODO_MAXIMO_DIAS} dias
        </span>
      </div>
      {erro && <p className="text-xs text-rose-400">{erro}</p>}
    </div>
  );
}
