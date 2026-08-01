import type { MetaOkr, ColaboradorParaAtribuicao } from "@/lib/types";
import { META_UNIDADE_LABEL, META_STATUS_LABEL } from "@/components/metas/meta-labels";

export function ResultadoChaveFields({
  item,
  responsaveis,
  mostrarValorAtual = false,
}: {
  item?: MetaOkr;
  responsaveis: ColaboradorParaAtribuicao[];
  /** Na criação, valor_atual começa em 0 e nem aparece no formulário; ao editar, é o principal campo de atualização de progresso. */
  mostrarValorAtual?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={item?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Valor meta *</label>
        <input
          name="valor_meta"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={item?.valor_meta ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      {mostrarValorAtual && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Valor atual</label>
          <input
            name="valor_atual"
            type="number"
            step="0.01"
            min="0"
            defaultValue={item?.valor_atual ?? 0}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Unidade</label>
        <select
          name="unidade"
          defaultValue={item?.unidade ?? "numero"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(META_UNIDADE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "nao_iniciado"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(META_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-zinc-400">Responsável</label>
        <select
          name="responsavel_id"
          defaultValue={item?.responsavel_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Sem responsável definido</option>
          {responsaveis.map((r) => (
            <option key={r.membro_id} value={r.membro_id}>
              {r.nome || r.email || "Colaborador"}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
