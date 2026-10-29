import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import type { Passo } from "@/lib/impressao-3d/primeiros-passos";

/**
 * Checklist "Primeiros passos" do nicho Impressão 3D. Cada passo é marcado só por dado real (lido no
 * servidor); não há como marcar à mão. Some quando tudo estiver concluído e pode ser ocultado em
 * Personalizar navegação (Visão Geral → Primeiros passos).
 */
export function PrimeirosPassos({ passos }: { passos: Passo[] }) {
  const feitos = passos.filter((p) => p.concluido).length;
  return (
    <section className="rounded-xl border border-copper-600/30 bg-copper-600/5 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-100">Primeiros passos</h2>
        <span className="text-xs text-zinc-500">
          {feitos} de {passos.length} concluídos
        </span>
      </div>
      <ul className="space-y-1.5">
        {passos.map((p) => (
          <li key={p.chave}>
            <Link
              href={p.destino}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-zinc-900"
            >
              {p.concluido ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-600" />
              )}
              <span className={p.concluido ? "text-zinc-500 line-through" : "text-zinc-200"}>{p.titulo}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
