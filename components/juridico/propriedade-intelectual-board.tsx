// Gerado a partir de components/colaborador/propriedade-intelectual-board.tsx para a empresa ativa (sem conta de
// outro dono): a origem do dono é a empresa, e a escrita fecha em modo leitura.
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Copyright, Plus, Pencil, Trash2 } from "lucide-react";
import type {
  PropriedadeIntelectual,
  PropriedadeIntelectualStatus,
  PropriedadeIntelectualTipo,
} from "@/lib/types";
import type { ClienteBasico } from "@/lib/juridico-shared";
import {
  createPropriedadeIntelectual,
  updatePropriedadeIntelectual,
  deletePropriedadeIntelectual,
} from "@/app/(dashboard)/juridico/propriedade-intelectual/actions";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";

const TIPO_OPTIONS: PropriedadeIntelectualTipo[] = [
  "Marca",
  "Patente",
  "Direito Autoral",
  "Domínio",
  "Outro",
];

const STATUS_OPTIONS: PropriedadeIntelectualStatus[] = [
  "registrado",
  "em_analise",
  "pendente",
  "vencido",
];

const STATUS_LABEL: Record<PropriedadeIntelectualStatus, string> = {
  registrado: "Registrado",
  em_analise: "Em análise",
  pendente: "Pendente",
  vencido: "Vencido",
};

const STATUS_TONE: Record<PropriedadeIntelectualStatus, ChipTone> = {
  registrado: "emerald",
  em_analise: "amber",
  pendente: "zinc",
  vencido: "rose",
};

function Fields({
  item,
  clientes,
}: {
  item?: PropriedadeIntelectual;
  clientes: ClienteBasico[];
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
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <select
          name="tipo"
          defaultValue={item?.tipo ?? "Marca"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {TIPO_OPTIONS.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="nome"
          required
          defaultValue={item?.nome}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Nº de registro
        </label>
        <input
          name="numero_registro"
          defaultValue={item?.numero_registro ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Órgão</label>
        <input
          name="orgao"
          placeholder="Ex: INPI"
          defaultValue={item?.orgao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "pendente"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Data de registro
        </label>
        <input
          name="data_registro"
          type="date"
          defaultValue={item?.data_registro ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Data de renovação
        </label>
        <input
          name="data_renovacao"
          type="date"
          defaultValue={item?.data_renovacao ?? ""}
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

function NewForm({ clientes }: { clientes: ClienteBasico[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPropriedadeIntelectual,
    undefined
  );

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
        Novo registro
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
  somenteLeitura,
}: {
  item: PropriedadeIntelectual;
  clientes: ClienteBasico[];
  hoje: string;
  somenteLeitura: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePropriedadeIntelectual.bind(null, item.id);
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
  const dias = item.data_renovacao ? diffInDays(hoje, item.data_renovacao) : null;
  const atrasado = dias !== null && dias < 0;
  const proximo = dias !== null && dias >= 0 && dias <= 7;

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
          {item.nome}
          <StatusChip tone={STATUS_TONE[item.status]}>
            {STATUS_LABEL[item.status]}
          </StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.tipo}
          {cliente ? ` · ${cliente.nome}` : item.cliente_id ? " · cliente: —" : ""}
          {item.orgao && ` · ${item.orgao}`}
          {item.data_renovacao &&
            ` · renovação ${formatDate(item.data_renovacao)}${atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}`}
        </p>
      </div>
      {!somenteLeitura && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form action={deletePropriedadeIntelectual.bind(null, item.id)}>
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

export function PropriedadeIntelectualBoard({
  itens,
  clientes,
  somenteLeitura = false,
  clientesIndisponiveis = false,
}: {
  itens: PropriedadeIntelectual[];
  clientes: ClienteBasico[];
  somenteLeitura?: boolean;
  /** Sem permissão em Clientes: nomes aparecem como "—" e a escrita fecha. */
  clientesIndisponiveis?: boolean;
}) {
  const [agruparPor, setAgruparPor] = useState<"cliente" | "status">("cliente");
  const hoje = todayISO();

  const grupos = new Map<string, PropriedadeIntelectual[]>();
  for (const item of itens) {
    const chave =
      agruparPor === "status"
        ? STATUS_LABEL[item.status]
        : (clientes.find((c) => c.id === item.cliente_id)?.nome ??
          (clientesIndisponiveis ? "—" : "Cliente removido"));
    const lista = grupos.get(chave) ?? [];
    lista.push(item);
    grupos.set(chave, lista);
  }
  for (const lista of grupos.values()) {
    lista.sort((a, b) => {
      if (!a.data_renovacao && !b.data_renovacao) return 0;
      if (!a.data_renovacao) return 1;
      if (!b.data_renovacao) return -1;
      return a.data_renovacao.localeCompare(b.data_renovacao);
    });
  }
  const gruposOrdenados = [...grupos.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Propriedade Intelectual
          </h1>
          <p className="text-sm text-zinc-500">
            {itens.length} registro(s)
          </p>
        </div>
        {!somenteLeitura && <NewForm clientes={clientes} />}
      </div>

      <div className="mb-6 flex w-fit items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {(["cliente", "status"] as const).map((opcao) => (
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
            Agrupar por {opcao === "cliente" ? "cliente" : "status"}
          </button>
        ))}
      </div>

      {gruposOrdenados.length > 0 ? (
        <div className="space-y-5">
          {gruposOrdenados.map(([grupo, itensDoGrupo]) => (
            <div
              key={grupo}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Copyright className="h-4 w-4 text-zinc-500" />
                {grupo}
                <span className="text-xs font-normal text-zinc-500">
                  ({itensDoGrupo.length})
                </span>
              </div>
              <div className="space-y-2">
                {itensDoGrupo.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    clientes={clientes}
                    hoje={hoje}
                    somenteLeitura={somenteLeitura}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-600">Nenhum registro cadastrado.</p>
        </div>
      )}
    </div>
  );
}
