import Link from "next/link";
import { StatusChip } from "@/components/status-chip";
import { ROTA_APROVACOES, fraseDaRegra, type Fundador } from "@/lib/aprovacoes-shared";

/**
 * Lista de fundadores (fundador + cofundadores) com a regra de aprovação.
 * Todos têm o mesmo nível: com 2 ou mais, qualquer alteração na empresa
 * espera a aprovação de todos. Server component: só mostra o que o servidor leu.
 */
export function FundadoresSection({ fundadores, meuId }: { fundadores: Fundador[]; meuId: string }) {
  const regra = fraseDaRegra(fundadores.length);

  return (
    <section className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Fundadores</h2>
        <p className="text-sm text-zinc-500">
          {regra ?? "Hoje você é o único fundador: suas alterações valem na hora."}
        </p>
      </div>

      {fundadores.length === 0 ? (
        <p className="text-xs text-zinc-500">Não foi possível carregar a lista de fundadores agora.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800">
          {fundadores.map((f) => (
            <li key={f.user_id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">
                  {f.nome || f.email || "Sem nome"}
                  {f.user_id === meuId && <span className="ml-1.5 text-xs text-zinc-500">(você)</span>}
                </p>
                {f.nome && f.email && <p className="truncate text-xs text-zinc-500">{f.email}</p>}
              </div>
              <StatusChip tone={f.papel === "cofundador" ? "copper" : "sky"}>
                {f.papel === "cofundador" ? "Cofundador" : "Fundador"}
              </StatusChip>
            </li>
          ))}
        </ul>
      )}

      {regra && (
        <Link href={ROTA_APROVACOES} className="inline-block text-xs font-medium text-copper-400 hover:text-copper-300">
          Ver aprovações →
        </Link>
      )}
    </section>
  );
}
