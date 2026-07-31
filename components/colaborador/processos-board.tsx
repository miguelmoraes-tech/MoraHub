"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Gavel, Plus, Pencil, Trash2 } from "lucide-react";
import type { Processo, ProcessoFase } from "@/lib/types";
import type { ClienteVinculado } from "@/lib/colaborador-shared";
import {
  createProcesso,
  updateProcesso,
  deleteProcesso,
} from "@/app/colaborador/advogado/processos/actions";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const FASE_OPTIONS: ProcessoFase[] = [
  "inicial",
  "instrucao",
  "recursal",
  "execucao",
  "encerrado",
];

const FASE_LABEL: Record<ProcessoFase, string> = {
  inicial: "Inicial",
  instrucao: "Instrução",
  recursal: "Recursal",
  execucao: "Execução",
  encerrado: "Encerrado",
};

const FASE_TONE: Record<ProcessoFase, ChipTone> = {
  inicial: "sky",
  instrucao: "amber",
  recursal: "copper",
  execucao: "rose",
  encerrado: "zinc",
};

function Fields({
  item,
  clientes,
}: {
  item?: Processo;
  clientes: ClienteVinculado[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Cliente *</label>
        <select
          name="cliente_id"
          required
          defaultValue={item?.cliente_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="" disabled>
            Selecione o cliente
          </option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} · {cliente.donoNome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Nº do processo
        </label>
        <input
          name="numero_processo"
          defaultValue={item?.numero_processo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Fase</label>
        <select
          name="fase"
          defaultValue={item?.fase ?? "inicial"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {FASE_OPTIONS.map((fase) => (
            <option key={fase} value={fase}>
              {FASE_LABEL[fase]}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tribunal / órgão
        </label>
        <input
          name="tribunal_orgao"
          defaultValue={item?.tribunal_orgao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Parte contrária
        </label>
        <input
          name="parte_contraria"
          defaultValue={item?.parte_contraria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tipo de ação
        </label>
        <input
          name="tipo_acao"
          defaultValue={item?.tipo_acao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Próximo prazo
        </label>
        <input
          name="proximo_prazo"
          type="date"
          defaultValue={item?.proximo_prazo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-3">
        <label className="text-xs font-medium text-zinc-400">
          Descrição do prazo
        </label>
        <input
          name="descricao_prazo"
          defaultValue={item?.descricao_prazo ?? ""}
          placeholder="Ex: prazo para contestação"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={item?.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewForm({ clientes }: { clientes: ClienteVinculado[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createProcesso, undefined);

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
        Novo processo
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields clientes={clientes} />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
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

function Row({
  item,
  clientes,
  hoje,
}: {
  item: Processo;
  clientes: ClienteVinculado[];
  hoje: string;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateProcesso.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} clientes={clientes} />
        {state && "error" in state && (
          <p className="text-xs text-rose-400">{state.error}</p>
        )}
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

  const cliente = clientes.find((c) => c.id === item.cliente_id);
  const emAndamento = item.fase !== "encerrado";
  const dias = item.proximo_prazo ? diffInDays(hoje, item.proximo_prazo) : null;
  const atrasado = emAndamento && dias !== null && dias < 0;
  const proximo = emAndamento && dias !== null && dias >= 0 && dias <= 7;

  const rowClass = atrasado
    ? "border-rose-800/60 bg-rose-950/20"
    : proximo
      ? "border-amber-800/60 bg-amber-950/20"
      : "border-zinc-800/80";

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${rowClass}`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.numero_processo || "Sem número"}
          <StatusChip tone={FASE_TONE[item.fase]}>
            {FASE_LABEL[item.fase]}
          </StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {cliente ? `${cliente.nome} · ${cliente.donoNome}` : "Cliente"}
          {item.parte_contraria && ` · vs ${item.parte_contraria}`}
          {item.proximo_prazo &&
            ` · prazo ${formatDate(item.proximo_prazo)}${atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}`}
          {item.descricao_prazo && ` · ${item.descricao_prazo}`}
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
        <form action={deleteProcesso.bind(null, item.id)}>
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

export function ProcessosBoard({
  processos,
  clientes,
}: {
  processos: Processo[];
  clientes: ClienteVinculado[];
}) {
  const [agruparPor, setAgruparPor] = useState<"cliente" | "fase">("cliente");
  const hoje = todayISO();

  const grupos = new Map<string, Processo[]>();
  for (const processo of processos) {
    const chave =
      agruparPor === "fase"
        ? FASE_LABEL[processo.fase]
        : (clientes.find((c) => c.id === processo.cliente_id)?.nome ??
          "Cliente removido");
    const lista = grupos.get(chave) ?? [];
    lista.push(processo);
    grupos.set(chave, lista);
  }
  for (const lista of grupos.values()) {
    lista.sort((a, b) => {
      if (!a.proximo_prazo && !b.proximo_prazo) return 0;
      if (!a.proximo_prazo) return 1;
      if (!b.proximo_prazo) return -1;
      return a.proximo_prazo.localeCompare(b.proximo_prazo);
    });
  }
  const gruposOrdenados = [...grupos.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Processos</h1>
          <p className="text-sm text-zinc-500">
            {processos.length} processo(s) · {clientes.length} cliente(s)
            vinculado(s)
          </p>
        </div>
        <NewForm clientes={clientes} />
      </div>

      <div className="mb-6 flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1 w-fit">
        {(["cliente", "fase"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setAgruparPor(opcao)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              agruparPor === opcao
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Agrupar por {opcao === "cliente" ? "cliente" : "fase"}
          </button>
        ))}
      </div>

      {gruposOrdenados.length > 0 ? (
        <div className="space-y-5">
          {gruposOrdenados.map(([grupo, itens]) => (
            <div
              key={grupo}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Gavel className="h-4 w-4 text-zinc-500" />
                {grupo}
                <span className="text-xs font-normal text-zinc-500">
                  ({itens.length})
                </span>
              </div>
              <div className="space-y-2">
                {itens.map((item) => (
                  <Row key={item.id} item={item} clientes={clientes} hoje={hoje} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-600">Nenhum processo cadastrado.</p>
        </div>
      )}
    </div>
  );
}
