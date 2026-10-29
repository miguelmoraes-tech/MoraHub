"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, Target, Users, DollarSign, TrendingUp } from "lucide-react";
import type { Campanha } from "@/lib/types";
import {
  createCampanha,
  updateCampanha,
  deleteCampanha,
} from "@/app/(dashboard)/marketing/campanhas/actions";
import { formatDate, formatCurrency } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { CampanhaFields } from "@/components/marketing/campanha-fields";
import { CAMPANHA_CANAL_LABEL, CAMPANHA_STATUS_LABEL, CAMPANHA_STATUS_TONE } from "@/components/marketing/campanha-labels";
import { computeCampanhaDerived, type CampanhaMetrics } from "@/lib/marketing/campanha-metrics-shared";

function NewCampanhaForm({ semInvestimento }: { semInvestimento: boolean }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCampanha, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Nova campanha
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <CampanhaFields semInvestimento={semInvestimento} />
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

const dash = (v: number | null, fmt: (n: number) => string = String) =>
  v === null ? "—" : fmt(v);

function RoiIndicador({
  campanha,
  metrics,
  semInvestimento,
}: {
  campanha: Campanha;
  metrics: CampanhaMetrics;
  semInvestimento: boolean;
}) {
  const { custoPorLead, roi } = computeCampanhaDerived(campanha, metrics);

  return (
    <div
      className={`grid grid-cols-2 gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3 ${
        semInvestimento ? "sm:grid-cols-3" : "sm:grid-cols-5"
      }`}
    >
      <div>
        <p className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Target className="h-3 w-3" /> Leads
        </p>
        <p className="text-sm font-semibold text-zinc-100">{dash(metrics.leadsGerados)}</p>
      </div>
      {!semInvestimento && (
        <div>
          <p className="text-[11px] text-zinc-500">Custo/lead</p>
          <p className="text-sm font-semibold text-zinc-100">
            {custoPorLead !== null ? formatCurrency(custoPorLead) : "—"}
          </p>
        </div>
      )}
      <div>
        <p className="flex items-center gap-1 text-[11px] text-zinc-500">
          <Users className="h-3 w-3" /> Convertidos
        </p>
        <p className="text-sm font-semibold text-zinc-100">{dash(metrics.clientesConvertidos)}</p>
      </div>
      <div>
        <p className="flex items-center gap-1 text-[11px] text-zinc-500">
          <DollarSign className="h-3 w-3" /> Receita
        </p>
        <p className="text-sm font-semibold text-zinc-100">
          {dash(metrics.receitaGerada, formatCurrency)}
        </p>
      </div>
      {!semInvestimento && (
        <div>
          <p className="flex items-center gap-1 text-[11px] text-zinc-500">
            <TrendingUp className="h-3 w-3" /> ROI
          </p>
          <p
            className={`text-sm font-semibold ${
              roi === null ? "text-zinc-100" : roi >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {roi !== null ? `${roi.toFixed(1)}%` : "—"}
          </p>
        </div>
      )}
    </div>
  );
}

function CampanhaCard({
  campanha,
  metrics,
  somenteLeitura,
  semInvestimento,
}: {
  campanha: Campanha;
  metrics: CampanhaMetrics;
  somenteLeitura: boolean;
  semInvestimento: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateCampanha.bind(null, campanha.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <CampanhaFields item={campanha} semInvestimento={semInvestimento} />
        {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-zinc-100">{campanha.nome}</h3>
          <p className="text-xs text-zinc-500">
            {CAMPANHA_CANAL_LABEL[campanha.canal]}
            {campanha.data_inicio && ` · desde ${formatDate(campanha.data_inicio)}`}
            {campanha.data_fim && ` até ${formatDate(campanha.data_fim)}`}
          </p>
        </div>
        <StatusChip tone={CAMPANHA_STATUS_TONE[campanha.status]}>
          {CAMPANHA_STATUS_LABEL[campanha.status]}
        </StatusChip>
      </div>

      <div
        className={`grid gap-3 text-xs text-zinc-500 ${
          semInvestimento ? "grid-cols-1" : "grid-cols-3"
        }`}
      >
        {!semInvestimento && (
          <>
            <div>
              <p className="text-zinc-600">Orçamento</p>
              <p className="text-sm text-zinc-200">
                {campanha.orcamento_planejado !== null
                  ? formatCurrency(campanha.orcamento_planejado)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-zinc-600">Gasto</p>
              <p className="text-sm text-zinc-200">{formatCurrency(campanha.valor_gasto ?? 0)}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-zinc-600">Cliques / Impressões</p>
          <p className="text-sm text-zinc-200">
            {campanha.cliques ?? 0} / {campanha.impressoes ?? 0}
          </p>
        </div>
      </div>

      <RoiIndicador campanha={campanha} metrics={metrics} semInvestimento={semInvestimento} />

      {campanha.observacoes && (
        <p className="text-xs text-zinc-500">{campanha.observacoes}</p>
      )}

      {!somenteLeitura && (
        <div className="flex items-center justify-end gap-1 border-t border-zinc-800/80 pt-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deleteCampanha.bind(null, campanha.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

const METRICS_VAZIO: CampanhaMetrics = { leadsGerados: 0, clientesConvertidos: 0, receitaGerada: 0 };

export function CampanhasBoard({
  campanhas,
  metrics,
  somenteLeitura = false,
  semInvestimento = false,
}: {
  campanhas: Campanha[];
  metrics: Record<string, CampanhaMetrics>;
  somenteLeitura?: boolean;
  semInvestimento?: boolean;
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Campanhas</h1>
          <p className="text-sm text-zinc-500">{campanhas.length} campanha(s)</p>
        </div>
        {!somenteLeitura && <NewCampanhaForm semInvestimento={semInvestimento} />}
      </div>

      {campanhas.length > 0 ? (
        <div className="space-y-4">
          {campanhas.map((campanha) => (
            <CampanhaCard
              key={campanha.id}
              campanha={campanha}
              metrics={metrics[campanha.id] ?? METRICS_VAZIO}
              somenteLeitura={somenteLeitura}
              semInvestimento={semInvestimento}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Megaphone className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhuma campanha cadastrada.</p>
        </div>
      )}
    </div>
  );
}
