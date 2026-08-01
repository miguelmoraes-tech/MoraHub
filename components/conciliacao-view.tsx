"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import {
  Landmark,
  Upload,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Filter,
} from "lucide-react";
import type { Comprovante, Gasto, LancamentoExtrato } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  desfazerConciliacao,
  importarOfx,
  marcarIgnorado,
  vincularLancamento,
} from "@/lib/actions/conciliacao";
import type { SugestaoMatch } from "@/lib/conciliacao/match";

export interface ContaOption {
  donoId: string;
  nome: string;
}

export type LancamentoComConta = LancamentoExtrato & { donoNome?: string };
export type GastoComConta = Gasto & { donoNome?: string };
export type ComprovanteComConta = Comprovante & { donoNome?: string };

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500";

function UploadForm({ contas }: { contas: ContaOption[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(importarOfx, undefined);
  useActionSuccess(state, () => formRef.current?.reset());

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <Upload className="h-4 w-4 text-zinc-500" />
        Importar extrato (OFX)
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {contas.length > 1 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-400">Conta</label>
            <select name="dono_id" defaultValue={contas[0]?.donoId} className={inputClass}>
              {contas.map((conta) => (
                <option key={conta.donoId} value={conta.donoId}>
                  {conta.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        {contas.length <= 1 && (
          <input type="hidden" name="dono_id" value={contas[0]?.donoId ?? ""} />
        )}
        <div className="min-w-[220px] flex-1 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Arquivo .ofx</label>
          <input
            name="arquivo"
            type="file"
            accept=".ofx,.qfx"
            required
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-400 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-zinc-200 focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending || contas.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {pending ? "Importando..." : "Importar"}
        </button>
      </div>
      {state && "error" in state && (
        <p className="mt-2 text-xs text-rose-400">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="mt-2 text-xs text-emerald-400">Extrato importado com sucesso.</p>
      )}
    </form>
  );
}

function Resumo({ lancamentos }: { lancamentos: LancamentoComConta[] }) {
  const grupos = useMemo(() => {
    const base = {
      pendente: { count: 0, valor: 0 },
      conciliado: { count: 0, valor: 0 },
      ignorado: { count: 0, valor: 0 },
    };
    for (const l of lancamentos) {
      base[l.status_conciliacao].count += 1;
      base[l.status_conciliacao].valor += l.valor;
    }
    return base;
  }, [lancamentos]);

  return (
    <div className="mb-6 grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/10 p-4">
        <p className="text-xs text-amber-400/80">Pendentes</p>
        <p className="mt-1 text-lg font-semibold text-zinc-100">{grupos.pendente.count}</p>
        <p className="text-xs text-zinc-500">{formatCurrency(grupos.pendente.valor)}</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs text-emerald-400/80">Conciliados</p>
        <p className="mt-1 text-lg font-semibold text-zinc-100">{grupos.conciliado.count}</p>
        <p className="text-xs text-zinc-500">{formatCurrency(grupos.conciliado.valor)}</p>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs text-zinc-500">Ignorados</p>
        <p className="mt-1 text-lg font-semibold text-zinc-100">{grupos.ignorado.count}</p>
        <p className="text-xs text-zinc-500">{formatCurrency(grupos.ignorado.valor)}</p>
      </div>
    </div>
  );
}

function VincularForm({
  lancamento,
  candidatos,
  sugestao,
}: {
  lancamento: LancamentoComConta;
  candidatos: { id: string; label: string; valor: number; data: string }[];
  sugestao: SugestaoMatch | undefined;
}) {
  const bound = vincularLancamento.bind(null, lancamento.id);
  const [state, formAction, pending] = useActionState(bound, undefined);
  const campoId = lancamento.tipo === "debito" ? "gasto_id" : "comprovante_id";

  if (candidatos.length === 0) {
    return (
      <p className="text-xs text-zinc-600">
        Nenhum {lancamento.tipo === "debito" ? "gasto" : "comprovante"} compatível disponível —
        marque manualmente depois de cadastrar, ou ignore.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="dono_id" value={lancamento.user_id} />
      {sugestao && (
        <span className="rounded-full bg-sky-900/40 px-2 py-0.5 text-[11px] font-medium text-sky-300">
          Sugestão
        </span>
      )}
      <select name={campoId} defaultValue={sugestao?.id ?? candidatos[0].id} className={inputClass}>
        {candidatos.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label} · {formatDate(c.data)} · {formatCurrency(c.valor)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        {pending ? "..." : sugestao ? "Confirmar" : "Vincular"}
      </button>
      {state && "error" in state && (
        <p className="w-full text-xs text-rose-400">{state.error}</p>
      )}
    </form>
  );
}

function IgnorarForm({ lancamento }: { lancamento: LancamentoComConta }) {
  const bound = marcarIgnorado.bind(null, lancamento.id);
  const [, formAction, pending] = useActionState(bound, undefined);
  return (
    <form action={formAction}>
      <input type="hidden" name="dono_id" value={lancamento.user_id} />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
      >
        <XCircle className="h-3.5 w-3.5" />
        Ignorar
      </button>
    </form>
  );
}

function DesfazerForm({ lancamento }: { lancamento: LancamentoComConta }) {
  const bound = desfazerConciliacao.bind(null, lancamento.id);
  const [, formAction, pending] = useActionState(bound, undefined);
  return (
    <form action={formAction}>
      <input type="hidden" name="dono_id" value={lancamento.user_id} />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1 rounded-md border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Desfazer
      </button>
    </form>
  );
}

const STATUS_ORDER: Record<LancamentoExtrato["status_conciliacao"], number> = {
  pendente: 0,
  conciliado: 1,
  ignorado: 2,
};

export function ConciliacaoView({
  lancamentos,
  gastos,
  comprovantes,
  sugestoes,
  contas,
}: {
  lancamentos: LancamentoComConta[];
  gastos: GastoComConta[];
  comprovantes: ComprovanteComConta[];
  sugestoes: Record<string, SugestaoMatch>;
  contas: ContaOption[];
}) {
  const [contaFiltro, setContaFiltro] = useState("");

  const lancamentosFiltrados = useMemo(() => {
    const base = contaFiltro
      ? lancamentos.filter((l) => l.user_id === contaFiltro)
      : lancamentos;
    return [...base].sort((a, b) => {
      const statusDiff = STATUS_ORDER[a.status_conciliacao] - STATUS_ORDER[b.status_conciliacao];
      if (statusDiff !== 0) return statusDiff;
      return b.data.localeCompare(a.data);
    });
  }, [lancamentos, contaFiltro]);

  const gastoLabelPorId = useMemo(() => new Map(gastos.map((g) => [g.id, g.nome])), [gastos]);
  const comprovanteLabelPorId = useMemo(
    () => new Map(comprovantes.map((c) => [c.id, c.descricao])),
    [comprovantes]
  );

  const gastosVinculados = useMemo(
    () => new Set(lancamentos.filter((l) => l.gasto_id).map((l) => l.gasto_id as string)),
    [lancamentos]
  );
  const comprovantesVinculados = useMemo(
    () => new Set(lancamentos.filter((l) => l.comprovante_id).map((l) => l.comprovante_id as string)),
    [lancamentos]
  );

  function candidatosPara(lancamento: LancamentoComConta) {
    if (lancamento.tipo === "debito") {
      return gastos
        .filter((g) => g.user_id === lancamento.user_id && !gastosVinculados.has(g.id))
        .map((g) => ({ id: g.id, label: g.nome, valor: g.valor, data: g.data }));
    }
    return comprovantes
      .filter(
        (c) => c.user_id === lancamento.user_id && c.data && !comprovantesVinculados.has(c.id)
      )
      .map((c) => ({ id: c.id, label: c.descricao, valor: c.valor, data: c.data as string }));
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Conciliação Bancária</h1>
          <p className="text-sm text-zinc-500">
            Importe o extrato em OFX e vincule cada lançamento a um gasto ou comprovante já
            cadastrado.
          </p>
        </div>
        {contas.length > 1 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500" />
            <select
              value={contaFiltro}
              onChange={(e) => setContaFiltro(e.target.value)}
              className="bg-transparent text-sm text-zinc-300 outline-none"
            >
              <option value="" className="bg-zinc-900">
                Todas as contas
              </option>
              {contas.map((conta) => (
                <option key={conta.donoId} value={conta.donoId} className="bg-zinc-900">
                  {conta.nome}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <UploadForm contas={contas} />
      <Resumo lancamentos={lancamentosFiltrados} />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Landmark className="h-4 w-4 text-zinc-500" />
          Lançamentos do extrato
        </div>

        {lancamentosFiltrados.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhum lançamento importado ainda.</p>
        ) : (
          <div className="space-y-2">
            {lancamentosFiltrados.map((lancamento) => (
              <div
                key={lancamento.id}
                className={`rounded-lg border px-3 py-2.5 ${
                  lancamento.status_conciliacao === "pendente"
                    ? "border-amber-800/50 bg-amber-950/10"
                    : "border-zinc-800/80"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{lancamento.descricao}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(lancamento.data)}
                      {lancamento.donoNome && ` · ${lancamento.donoNome}`}
                      {" · "}
                      <span
                        className={
                          lancamento.tipo === "credito" ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {lancamento.tipo === "credito" ? "Crédito" : "Débito"}
                      </span>
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-medium ${
                      lancamento.tipo === "credito" ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {formatCurrency(lancamento.valor)}
                  </p>
                </div>

                <div className="mt-2">
                  {lancamento.status_conciliacao === "pendente" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <VincularForm
                        lancamento={lancamento}
                        candidatos={candidatosPara(lancamento)}
                        sugestao={sugestoes[lancamento.id]}
                      />
                      <IgnorarForm lancamento={lancamento} />
                    </div>
                  )}
                  {lancamento.status_conciliacao === "conciliado" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-emerald-400">
                        Conciliado com:{" "}
                        {lancamento.gasto_id
                          ? (gastoLabelPorId.get(lancamento.gasto_id) ?? "Gasto removido")
                          : lancamento.comprovante_id
                            ? (comprovanteLabelPorId.get(lancamento.comprovante_id) ??
                              "Comprovante removido")
                            : "—"}
                      </p>
                      <DesfazerForm lancamento={lancamento} />
                    </div>
                  )}
                  {lancamento.status_conciliacao === "ignorado" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-zinc-600">Ignorado (ex: transferência interna).</p>
                      <DesfazerForm lancamento={lancamento} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
