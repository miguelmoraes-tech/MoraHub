"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type {
  PessoalProject,
  PessoalTask,
  PessoalTaskPriority,
} from "@/lib/pessoal/types";
import { TASK_PRIORITIES } from "@/lib/pessoal/categories";
import {
  createPessoalTarefa,
  updatePessoalTarefa,
  togglePessoalTarefaConcluida,
  deletePessoalTarefa,
} from "@/app/(dashboard)/pessoal/tarefas/actions";
import { formatDate, isOverdue } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";

type ProjetoOption = Pick<PessoalProject, "id" | "name">;

function TarefaFields({
  tarefa,
  projetos,
  defaultDueDate,
}: {
  tarefa?: PessoalTask;
  projetos: ProjetoOption[];
  defaultDueDate?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="title"
          required
          defaultValue={tarefa?.title}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Prazo</label>
        <input
          name="due_date"
          type="date"
          defaultValue={tarefa?.due_date ?? defaultDueDate ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Prioridade</label>
        <select
          name="priority"
          defaultValue={tarefa?.priority ?? "media"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Projeto</label>
        <select
          name="project_id"
          defaultValue={tarefa?.project_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="">Sem projeto</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={tarefa?.description ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
    </div>
  );
}

function NewTarefaForm({
  projetos,
  defaultDueDate,
  forceOpen,
  onClose,
}: {
  projetos: ProjetoOption[];
  defaultDueDate?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(!!forceOpen);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalTarefa,
    undefined
  );

  useActionSuccess(state, () => {
    setOpen(false);
    onClose?.();
  });

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-petrol-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-petrol-500"
      >
        <Plus className="h-4 w-4" />
        Nova tarefa
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <TarefaFields projetos={projetos} defaultDueDate={defaultDueDate} />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onClose?.();
          }}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function TarefaRow({
  tarefa,
  projetos,
}: {
  tarefa: PessoalTask;
  projetos: ProjetoOption[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalTarefa.bind(null, tarefa.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <TarefaFields tarefa={tarefa} projetos={projetos} />
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
            className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const prioridade = TASK_PRIORITIES.find((p) => p.value === tarefa.priority);
  const projeto = projetos.find((p) => p.id === tarefa.project_id);
  const overdue = isOverdue(tarefa.due_date) && tarefa.status === "pendente";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={() => togglePessoalTarefaConcluida(tarefa.id, tarefa.status)}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
            tarefa.status === "concluida"
              ? "border-petrol-500 bg-petrol-500"
              : "border-zinc-700"
          }`}
        >
          {tarefa.status === "concluida" && (
            <span className="h-1.5 w-1.5 rounded-sm bg-white" />
          )}
        </button>
        <div className="min-w-0">
          <p
            className={`truncate text-sm ${
              tarefa.status === "concluida"
                ? "text-zinc-500 line-through"
                : "text-zinc-200"
            }`}
          >
            {tarefa.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip tone="zinc">
              <span style={{ color: prioridade?.color }}>{prioridade?.label}</span>
            </StatusChip>
            {tarefa.due_date && (
              <span className={`text-xs ${overdue ? "font-medium text-rose-400" : "text-zinc-500"}`}>
                {formatDate(tarefa.due_date)}
              </span>
            )}
            {overdue && <StatusChip tone="rose">Atrasada</StatusChip>}
            {projeto && (
              <Link
                href={`/pessoal/projetos/${projeto.id}`}
                className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-petrol-300"
              >
                {projeto.name}
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deletePessoalTarefa.bind(null, tarefa.id)}>
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

function ListaView({
  tarefas,
  projetos,
}: {
  tarefas: PessoalTask[];
  projetos: ProjetoOption[];
}) {
  const [completedOpen, setCompletedOpen] = useState(false);

  const pendentes = tarefas.filter((t) => t.status === "pendente");
  const comData = pendentes
    .filter((t) => t.due_date)
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));
  const semData = pendentes.filter((t) => !t.due_date);
  const concluidas = tarefas
    .filter((t) => t.status === "concluida")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));

  return (
    <div className="space-y-4">
      {pendentes.length > 0 ? (
        <div className="space-y-2">
          {comData.map((tarefa) => (
            <TarefaRow key={tarefa.id} tarefa={tarefa} projetos={projetos} />
          ))}
          {semData.length > 0 && (
            <>
              <p className="pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                Sem data
              </p>
              {semData.map((tarefa) => (
                <TarefaRow key={tarefa.id} tarefa={tarefa} projetos={projetos} />
              ))}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhuma tarefa pendente.</p>
      )}

      <div>
        <button
          type="button"
          onClick={() => setCompletedOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${completedOpen ? "" : "-rotate-90"}`}
          />
          Concluídas ({concluidas.length})
        </button>
        {completedOpen && (
          <div className="mt-2 space-y-2">
            {concluidas.map((tarefa) => (
              <TarefaRow key={tarefa.id} tarefa={tarefa} projetos={projetos} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoOf(year: number, monthIndex0: number, day: number) {
  return `${year}-${pad(monthIndex0 + 1)}-${pad(day)}`;
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

function firstWeekday(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay();
}

type Cell = { iso: string; day: number; inMonth: boolean };

function buildCells(year: number, monthIndex0: number): Cell[] {
  const total = daysInMonth(year, monthIndex0);
  const leading = firstWeekday(year, monthIndex0);
  const prevMonthIndex = monthIndex0 === 0 ? 11 : monthIndex0 - 1;
  const prevYear = monthIndex0 === 0 ? year - 1 : year;
  const prevTotal = daysInMonth(prevYear, prevMonthIndex);
  const nextMonthIndex = monthIndex0 === 11 ? 0 : monthIndex0 + 1;
  const nextYear = monthIndex0 === 11 ? year + 1 : year;

  const cells: Cell[] = [];
  for (let i = leading - 1; i >= 0; i--) {
    const day = prevTotal - i;
    cells.push({ iso: isoOf(prevYear, prevMonthIndex, day), day, inMonth: false });
  }
  for (let day = 1; day <= total; day++) {
    cells.push({ iso: isoOf(year, monthIndex0, day), day, inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 42) {
    cells.push({ iso: isoOf(nextYear, nextMonthIndex, nextDay), day: nextDay, inMonth: false });
    nextDay++;
  }
  return cells;
}

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function CalendarioView({
  tarefas,
  projetos,
  onCreateOnDate,
}: {
  tarefas: PessoalTask[];
  projetos: ProjetoOption[];
  onCreateOnDate: (iso: string) => void;
}) {
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = hoje.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const tarefasByDate = useMemo(() => {
    const map = new Map<string, PessoalTask[]>();
    for (const tarefa of tarefas) {
      if (!tarefa.due_date) continue;
      const list = map.get(tarefa.due_date) ?? [];
      list.push(tarefa);
      map.set(tarefa.due_date, list);
    }
    return map;
  }, [tarefas]);

  const cells = useMemo(() => buildCells(cursor.year, cursor.month), [cursor]);

  function openDay(iso: string) {
    setSelectedDate(iso);
    dialogRef.current?.showModal();
  }

  const selectedTarefas = selectedDate ? (tarefasByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCursor((c) =>
                c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
              )
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="w-40 text-center text-sm font-semibold text-zinc-100">
            {MESES[cursor.month]} de {cursor.year}
          </h2>
          <button
            type="button"
            onClick={() =>
              setCursor((c) =>
                c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
              )
            }
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            const [y, m] = hoje.split("-").map(Number);
            setCursor({ year: y, month: m - 1 });
          }}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          Hoje
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600">
            {dia}
          </div>
        ))}

        {cells.map((cell) => {
          const tarefasDoDia = tarefasByDate.get(cell.iso) ?? [];
          const count = tarefasDoDia.length;
          const isToday = cell.iso === hoje;
          const priorityColor = count === 1 ? TASK_PRIORITIES.find((p) => p.value === tarefasDoDia[0].priority)?.color : undefined;

          const dayNumberClass = !cell.inMonth
            ? "text-zinc-700"
            : isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-petrol-600 text-white"
              : "text-zinc-300";

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => openDay(cell.iso)}
              className={`flex min-h-[64px] flex-col items-start justify-between gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-petrol-500/60 sm:min-h-[84px] ${
                cell.inMonth ? "border-zinc-800/80" : "border-zinc-900 bg-zinc-950/40"
              }`}
            >
              <span className={`text-xs font-medium ${dayNumberClass}`}>{cell.day}</span>
              {count === 1 && (
                <span className="h-2 w-2 self-start rounded-full" style={{ backgroundColor: priorityColor }} />
              )}
              {count > 1 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center self-start rounded-full bg-zinc-700 px-1 text-[10px] font-semibold text-zinc-200">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setSelectedDate(null)}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="text-sm font-semibold">{selectedDate && formatDate(selectedDate)}</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} className="shrink-0 text-zinc-500 hover:text-zinc-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 px-5 py-4">
            {selectedTarefas.length > 0 ? (
              selectedTarefas.map((tarefa) => (
                <TarefaRow key={tarefa.id} tarefa={tarefa} projetos={projetos} />
              ))
            ) : (
              <p className="text-xs text-zinc-600">Nenhuma tarefa nesta data.</p>
            )}
            {selectedDate && (
              <button
                type="button"
                onClick={() => {
                  dialogRef.current?.close();
                  onCreateOnDate(selectedDate);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-petrol-400 hover:text-petrol-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova tarefa nesta data
              </button>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}

export function TarefasSection({
  tarefas,
  projetos,
}: {
  tarefas: PessoalTask[];
  projetos: ProjetoOption[];
}) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PessoalTaskPriority | "">("");
  const [projetoFiltro, setProjetoFiltro] = useState<string>("");
  const [creatingDueDate, setCreatingDueDate] = useState<string | undefined>(undefined);
  const [createKey, setCreateKey] = useState(0);

  const filtradas = tarefas.filter((t) => {
    if (prioridadeFiltro && t.priority !== prioridadeFiltro) return false;
    if (projetoFiltro === "sem_projeto" && t.project_id) return false;
    if (projetoFiltro && projetoFiltro !== "sem_projeto" && t.project_id !== projetoFiltro)
      return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Tarefas</h1>
          <p className="text-sm text-zinc-500">{tarefas.length} tarefa(s) no total</p>
        </div>
        <NewTarefaForm
          key={createKey}
          projetos={projetos}
          defaultDueDate={creatingDueDate}
          forceOpen={!!creatingDueDate}
          onClose={() => setCreatingDueDate(undefined)}
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setView("lista")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              view === "lista" ? "bg-petrol-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setView("calendario")}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              view === "calendario" ? "bg-petrol-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Calendário
          </button>
        </div>

        <select
          value={prioridadeFiltro}
          onChange={(e) => setPrioridadeFiltro(e.target.value as PessoalTaskPriority | "")}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
        >
          <option value="">Todas as prioridades</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={projetoFiltro}
          onChange={(e) => setProjetoFiltro(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
        >
          <option value="">Todos os projetos</option>
          <option value="sem_projeto">Sem projeto</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.name}
            </option>
          ))}
        </select>
      </div>

      {view === "lista" ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <ListChecks className="h-4 w-4 text-zinc-500" />
            Tarefas
          </div>
          <ListaView tarefas={filtradas} projetos={projetos} />
        </div>
      ) : (
        <CalendarioView
          tarefas={filtradas}
          projetos={projetos}
          onCreateOnDate={(iso) => {
            setCreatingDueDate(iso);
            setCreateKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
