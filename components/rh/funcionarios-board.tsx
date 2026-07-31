"use client";

import { useEffect, useMemo, useRef, useState, useActionState } from "react";
import { Users, Plus, Pencil, Trash2, Network, List } from "lucide-react";
import type {
  Departamento,
  Funcionario,
  FuncionarioStatus,
  FuncionarioTipoContrato,
} from "@/lib/types";
import {
  createFuncionario,
  updateFuncionario,
  deleteFuncionario,
} from "@/app/(dashboard)/rh/funcionarios/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";

const TIPO_CONTRATO_LABEL: Record<FuncionarioTipoContrato, string> = {
  clt: "CLT",
  pj: "PJ",
  estagio: "Estágio",
  freelancer: "Freelancer",
  outro: "Outro",
};

const STATUS_LABEL: Record<FuncionarioStatus, string> = {
  ativo: "Ativo",
  afastado: "Afastado",
  desligado: "Desligado",
};

const STATUS_TONE: Record<FuncionarioStatus, ChipTone> = {
  ativo: "emerald",
  afastado: "amber",
  desligado: "zinc",
};

function Fields({
  item,
  departamentos,
  funcionarios,
}: {
  item?: Funcionario;
  departamentos: Departamento[];
  funcionarios: Funcionario[];
}) {
  const gestorOpcoes = funcionarios.filter((f) => f.id !== item?.id);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
        <label className="text-xs font-medium text-zinc-400">Cargo</label>
        <input
          name="cargo"
          defaultValue={item?.cargo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">CPF</label>
        <input
          name="cpf"
          defaultValue={item?.cpf ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">E-mail</label>
        <input
          name="email"
          type="email"
          defaultValue={item?.email ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Telefone</label>
        <input
          name="telefone"
          defaultValue={item?.telefone ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Admissão</label>
        <input
          name="data_admissao"
          type="date"
          defaultValue={item?.data_admissao ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Desligamento</label>
        <input
          name="data_desligamento"
          type="date"
          defaultValue={item?.data_desligamento ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo de contrato</label>
        <select
          name="tipo_contrato"
          defaultValue={item?.tipo_contrato ?? "clt"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(TIPO_CONTRATO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Salário</label>
        <input
          name="salario"
          type="number"
          step="0.01"
          min="0"
          defaultValue={item?.salario ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={item?.status ?? "ativo"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Departamento</label>
        <select
          name="departamento_id"
          defaultValue={item?.departamento_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Gestor direto</label>
        <select
          name="gestor_id"
          defaultValue={item?.gestor_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {gestorOpcoes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
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

function NewForm({
  departamentos,
  funcionarios,
}: {
  departamentos: Departamento[];
  funcionarios: Funcionario[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createFuncionario, undefined);

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
        Novo funcionário
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields departamentos={departamentos} funcionarios={funcionarios} />
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

function Row({
  item,
  departamentos,
  funcionarios,
}: {
  item: Funcionario;
  departamentos: Departamento[];
  funcionarios: Funcionario[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateFuncionario.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <Fields item={item} departamentos={departamentos} funcionarios={funcionarios} />
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

  const departamento = departamentos.find((d) => d.id === item.departamento_id);
  const gestor = funcionarios.find((f) => f.id === item.gestor_id);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
          {item.nome}
          <StatusChip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</StatusChip>
          <StatusChip tone="copper">{TIPO_CONTRATO_LABEL[item.tipo_contrato]}</StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {item.cargo ?? "Sem cargo"}
          {departamento && ` · ${departamento.nome}`}
          {gestor && ` · reporta a ${gestor.nome}`}
          {item.salario != null && ` · ${formatCurrency(item.salario)}`}
          {item.data_admissao && ` · admitido em ${formatDate(item.data_admissao)}`}
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
        <form action={deleteFuncionario.bind(null, item.id)}>
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

function OrganogramaView({
  funcionarios,
  departamentos,
}: {
  funcionarios: Funcionario[];
  departamentos: Departamento[];
}) {
  const funcionarioNome = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const semDepartamento = funcionarios.filter((f) => !f.departamento_id);
  const grupos = [
    ...departamentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      itens: funcionarios.filter((f) => f.departamento_id === d.id),
    })),
    ...(semDepartamento.length > 0
      ? [{ id: "sem-departamento", nome: "Sem departamento", itens: semDepartamento }]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {grupos.map((grupo) => (
        <div key={grupo.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-100">
            {grupo.nome} <span className="text-zinc-500">({grupo.itens.length})</span>
          </p>
          {grupo.itens.length > 0 ? (
            <div className="space-y-2">
              {grupo.itens.map((f) => (
                <div key={f.id} className="rounded-lg border border-zinc-800/80 px-3 py-2">
                  <p className="text-sm text-zinc-200">
                    {f.nome}
                    {f.cargo && <span className="text-zinc-500"> · {f.cargo}</span>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {f.gestor_id
                      ? `reporta a ${funcionarioNome.get(f.gestor_id) ?? "—"}`
                      : "sem gestor direto"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhum funcionário.</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function FuncionariosBoard({
  funcionarios,
  departamentos,
}: {
  funcionarios: Funcionario[];
  departamentos: Departamento[];
}) {
  const [view, setView] = useState<"lista" | "organograma">("lista");
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<FuncionarioStatus | "">("");

  const departamentoNomes = useMemo(
    () => departamentos.map((d) => d.nome),
    [departamentos]
  );
  const statusOpcoes = Object.values(STATUS_LABEL);

  const porDepartamento = departamentoFiltro
    ? funcionarios.filter(
        (f) => departamentos.find((d) => d.id === f.departamento_id)?.nome === departamentoFiltro
      )
    : funcionarios;
  const filtrados = statusFiltro
    ? porDepartamento.filter((f) => f.status === statusFiltro)
    : porDepartamento;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Funcionários</h1>
          <p className="text-sm text-zinc-500">{filtrados.length} funcionário(s)</p>
        </div>
        <NewForm departamentos={departamentos} funcionarios={funcionarios} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setView("lista")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "lista" ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView("organograma")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "organograma"
                ? "bg-copper-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            Organograma
          </button>
        </div>

        {view === "lista" && (
          <>
            {departamentoNomes.length > 0 && (
              <SegmentFilter
                value={departamentoFiltro}
                options={departamentoNomes}
                allLabel="Todos os departamentos"
                onChange={setDepartamentoFiltro}
              />
            )}
            <SegmentFilter
              value={statusFiltro ? STATUS_LABEL[statusFiltro] : ""}
              options={statusOpcoes}
              allLabel="Todos os status"
              onChange={(value) => {
                const entry = Object.entries(STATUS_LABEL).find(([, label]) => label === value);
                setStatusFiltro((entry?.[0] as FuncionarioStatus) ?? "");
              }}
            />
          </>
        )}
      </div>

      {view === "organograma" ? (
        <OrganogramaView funcionarios={funcionarios} departamentos={departamentos} />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Users className="h-4 w-4 text-zinc-500" />
            Todos os funcionários
          </div>

          {filtrados.length > 0 ? (
            <div className="space-y-2">
              {filtrados.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  departamentos={departamentos}
                  funcionarios={funcionarios}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhum funcionário cadastrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
