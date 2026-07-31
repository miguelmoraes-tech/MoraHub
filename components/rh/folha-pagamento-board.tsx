"use client";

import { useMemo, useRef, useState, useActionState } from "react";
import { Banknote, Pencil, Trash2, Sparkles } from "lucide-react";
import type { FolhaPagamento, FolhaPagamentoStatus, Funcionario } from "@/lib/types";
import {
  gerarFolhaMes,
  updateFolhaPagamento,
  deleteFolhaPagamento,
} from "@/app/(dashboard)/rh/folha/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const STATUS_LABEL: Record<FolhaPagamentoStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
};

const STATUS_TONE: Record<FolhaPagamentoStatus, ChipTone> = {
  pendente: "amber",
  pago: "emerald",
};

function mesLabel(mesReferencia: string) {
  const [ano, mes] = mesReferencia.split("-");
  return `${mes}/${ano}`;
}

function GerarFolhaForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(gerarFolhaMes, undefined);

  useActionSuccess(state, () => setOpen(false));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Sparkles className="h-4 w-4" />
        Gerar folha do mês
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Mês de referência *</label>
        <input
          name="mes_referencia"
          type="month"
          required
          defaultValue={todayISO().slice(0, 7)}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Dia do vencimento (mês seguinte)</label>
        <input
          name="dia_vencimento"
          type="number"
          min="1"
          max="28"
          defaultValue={5}
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
      <div className="flex gap-2">
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
          {pending ? "Gerando..." : "Gerar"}
        </button>
      </div>
    </form>
  );
}

function Fields({ item }: { item: FolhaPagamento }) {
  const [bruto, setBruto] = useState(String(item.salario_bruto ?? 0));
  const [descontos, setDescontos] = useState(String(item.descontos ?? 0));
  const [liquido, setLiquido] = useState(String(item.salario_liquido ?? 0));
  const [status, setStatus] = useState<FolhaPagamentoStatus>(item.status);

  function recalcularLiquido(novoBruto: string, novosDescontos: string) {
    const brutoNum = Number(novoBruto) || 0;
    const descontosNum = Number(novosDescontos) || 0;
    setLiquido(String(Math.max(brutoNum - descontosNum, 0)));
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Salário bruto</label>
        <input
          name="salario_bruto"
          type="number"
          step="0.01"
          min="0"
          value={bruto}
          onChange={(e) => {
            setBruto(e.target.value);
            recalcularLiquido(e.target.value, descontos);
          }}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Descontos</label>
        <input
          name="descontos"
          type="number"
          step="0.01"
          min="0"
          value={descontos}
          onChange={(e) => {
            setDescontos(e.target.value);
            recalcularLiquido(bruto, e.target.value);
          }}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Salário líquido</label>
        <input
          name="salario_liquido"
          type="number"
          step="0.01"
          min="0"
          value={liquido}
          onChange={(e) => setLiquido(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as FolhaPagamentoStatus)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {status === "pago" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Data de pagamento</label>
          <input
            name="data_pagamento"
            type="date"
            defaultValue={item.data_pagamento ?? todayISO()}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      )}
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={item.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function Row({ item, funcionarios }: { item: FolhaPagamento; funcionarios: Funcionario[] }) {
  const [editing, setEditing] = useState(false);
  const action = updateFolhaPagamento.bind(null, item.id, item.conta_pagar_id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  const funcionario = funcionarios.find((f) => f.id === item.funcionario_id);

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <p className="text-sm font-medium text-zinc-200">{funcionario?.nome ?? "Funcionário"}</p>
        <Fields item={item} />
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
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {funcionario?.nome ?? "Funcionário"}
          <StatusChip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          líquido {formatCurrency(item.salario_liquido ?? 0)}
          {" · "}bruto {formatCurrency(item.salario_bruto ?? 0)}
          {(item.descontos ?? 0) > 0 && ` · descontos ${formatCurrency(item.descontos ?? 0)}`}
          {item.data_pagamento && ` · pago em ${formatDate(item.data_pagamento)}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteFolhaPagamento.bind(null, item.id, item.conta_pagar_id)}>
          <button
            type="submit"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export function FolhaPagamentoBoard({
  folhas,
  funcionarios,
}: {
  folhas: FolhaPagamento[];
  funcionarios: Funcionario[];
}) {
  const grupos = useMemo(() => {
    const map = new Map<string, FolhaPagamento[]>();
    for (const f of folhas) {
      const lista = map.get(f.mes_referencia) ?? [];
      lista.push(f);
      map.set(f.mes_referencia, lista);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [folhas]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Folha de Pagamento</h1>
          <p className="text-sm text-zinc-500">{folhas.length} registro(s)</p>
        </div>
        <GerarFolhaForm />
      </div>

      {grupos.length > 0 ? (
        <div className="space-y-5">
          {grupos.map(([mes, itens]) => {
            const pagos = itens.filter((i) => i.status === "pago").length;
            const total = itens.reduce((sum, i) => sum + (i.salario_liquido ?? 0), 0);
            return (
              <div key={mes} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <Banknote className="h-4 w-4 text-zinc-500" />
                    {mesLabel(mes)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {pagos} de {itens.length} pagos · {formatCurrency(total)} no total
                  </p>
                </div>
                <div className="space-y-2">
                  {itens.map((item) => (
                    <Row key={item.id} item={item} funcionarios={funcionarios} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-500">
            Nenhuma folha gerada ainda. Use &quot;Gerar folha do mês&quot; para começar.
          </p>
        </div>
      )}
    </div>
  );
}
