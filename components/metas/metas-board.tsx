"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Plus, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { MetaOkr, ColaboradorParaAtribuicao } from "@/lib/types";
import { agruparObjetivos, periodoAtualInclui, calcularProgresso, type ObjetivoAgrupado } from "@/lib/metas/grouping";
import { todayISO } from "@/lib/vencimentos/dates";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { ProgressBar } from "@/components/metas/progress-bar";
import { ObjetivoFields } from "@/components/metas/objetivo-fields";
import { ResultadoChaveFields } from "@/components/metas/resultado-chave-fields";
import {
  META_SETOR_LABEL,
  META_STATUS_LABEL,
  META_STATUS_TONE,
  formatValorUnidade,
} from "@/components/metas/meta-labels";
import {
  createObjetivo,
  updateObjetivo,
  deleteObjetivo,
  createResultadoChave,
  updateResultadoChave,
  deleteResultadoChave,
} from "@/app/(dashboard)/metas/actions";

function NewObjetivoForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createObjetivo, undefined);

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
        Novo objetivo
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ObjetivoFields />
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

function NewResultadoChaveForm({
  objetivoId,
  responsaveis,
}: {
  objetivoId: string;
  responsaveis: ColaboradorParaAtribuicao[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createResultadoChave.bind(null, objetivoId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar resultado-chave
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3"
    >
      <ResultadoChaveFields responsaveis={responsaveis} />
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

function ResultadoChaveRow({
  resultado,
  responsaveis,
}: {
  resultado: MetaOkr;
  responsaveis: ColaboradorParaAtribuicao[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateResultadoChave.bind(null, resultado.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ResultadoChaveFields item={resultado} responsaveis={responsaveis} mostrarValorAtual />
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

  const progresso = calcularProgresso(resultado);
  const responsavelNome = resultado.responsavel_id
    ? (responsaveis.find((r) => r.membro_id === resultado.responsavel_id)?.nome ?? null)
    : null;

  return (
    <div className="space-y-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {resultado.titulo}
          <StatusChip tone={META_STATUS_TONE[resultado.status]}>
            {META_STATUS_LABEL[resultado.status]}
          </StatusChip>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deleteResultadoChave.bind(null, resultado.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
      <ProgressBar progresso={progresso} />
      <p className="text-xs text-zinc-500">
        {formatValorUnidade(resultado.valor_atual, resultado.unidade)} de{" "}
        {formatValorUnidade(resultado.valor_meta ?? 0, resultado.unidade)} ({progresso.toFixed(0)}%)
        {responsavelNome && ` · ${responsavelNome}`}
      </p>
    </div>
  );
}

function ObjetivoCard({
  agrupado,
  responsaveis,
}: {
  agrupado: ObjetivoAgrupado;
  responsaveis: ColaboradorParaAtribuicao[];
}) {
  const { objetivo, resultados, progressoMedio, atrasado } = agrupado;
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const action = updateObjetivo.bind(null, objetivo.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  const cardClass = atrasado
    ? "border-rose-800/60 bg-rose-950/10"
    : "border-zinc-800 bg-zinc-900/50";

  if (editing) {
    return (
      <div className={`space-y-3 rounded-xl border p-4 ${cardClass}`}>
        <form action={formAction} className="space-y-3">
          <ObjetivoFields item={objetivo} />
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
      </div>
    );
  }

  return (
    <div className={`space-y-3 rounded-xl border p-4 ${cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          {expanded ? (
            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          ) : (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          )}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-100">
              {objetivo.titulo}
              <StatusChip tone={META_STATUS_TONE[objetivo.status]}>
                {META_STATUS_LABEL[objetivo.status]}
              </StatusChip>
              {atrasado && objetivo.status !== "atrasado" && (
                <StatusChip tone="rose">
                  <AlertTriangle className="h-3 w-3" />
                  Prazo vencido
                </StatusChip>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {META_SETOR_LABEL[objetivo.setor]}
              {objetivo.periodo_inicio && ` · ${formatDate(objetivo.periodo_inicio)}`}
              {objetivo.periodo_fim && ` a ${formatDate(objetivo.periodo_fim)}`}
              {resultados.length > 0 &&
                ` · ${resultados.length} resultado(s)-chave`}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deleteObjetivo.bind(null, objetivo.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {progressoMedio !== null && (
        <div className="space-y-1">
          <ProgressBar progresso={progressoMedio} atrasado={atrasado} />
          <p className="text-xs text-zinc-500">
            Progresso médio: {progressoMedio.toFixed(0)}%
          </p>
        </div>
      )}

      {objetivo.descricao && <p className="text-xs text-zinc-500">{objetivo.descricao}</p>}

      {expanded && (
        <div className="space-y-2 border-t border-zinc-800/80 pt-3">
          {resultados.map((resultado) => (
            <ResultadoChaveRow key={resultado.id} resultado={resultado} responsaveis={responsaveis} />
          ))}
          <NewResultadoChaveForm objetivoId={objetivo.id} responsaveis={responsaveis} />
        </div>
      )}
    </div>
  );
}

export function MetasBoard({
  itens,
  responsaveis,
}: {
  itens: MetaOkr[];
  responsaveis: ColaboradorParaAtribuicao[];
}) {
  const [setor, setSetor] = useState("");
  const [somentePeriodoAtual, setSomentePeriodoAtual] = useState(false);
  const hoje = useMemo(() => todayISO(), []);

  const agrupados = useMemo(() => agruparObjetivos(itens, hoje), [itens, hoje]);

  const filtrados = useMemo(() => {
    return agrupados.filter((a) => {
      if (setor && META_SETOR_LABEL[a.objetivo.setor] !== setor) return false;
      if (somentePeriodoAtual && !periodoAtualInclui(a.objetivo, hoje)) return false;
      return true;
    });
  }, [agrupados, setor, somentePeriodoAtual, hoje]);

  const ordenados = useMemo(
    () =>
      [...filtrados].sort((a, b) => {
        if (a.atrasado !== b.atrasado) return a.atrasado ? -1 : 1;
        return (a.objetivo.periodo_fim ?? "9999").localeCompare(b.objetivo.periodo_fim ?? "9999");
      }),
    [filtrados]
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Metas / OKRs</h1>
          <p className="text-sm text-zinc-500">{ordenados.length} objetivo(s)</p>
        </div>
        <NewObjetivoForm />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={setor}
          options={Object.values(META_SETOR_LABEL)}
          allLabel="Todos os setores"
          onChange={setSetor}
        />
        <button
          type="button"
          onClick={() => setSomentePeriodoAtual((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            somentePeriodoAtual
              ? "border-copper-600/60 bg-copper-950/30 text-copper-300"
              : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Flag className="h-3.5 w-3.5" />
          Somente período atual
        </button>
      </div>

      {ordenados.length > 0 ? (
        <div className="space-y-4">
          {ordenados.map((agrupado) => (
            <ObjetivoCard key={agrupado.objetivo.id} agrupado={agrupado} responsaveis={responsaveis} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Flag className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum objetivo cadastrado.</p>
        </div>
      )}
    </div>
  );
}
