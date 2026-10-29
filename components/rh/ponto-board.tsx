"use client";

import { useMemo, useRef, useState, useActionState } from "react";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import type { ControlePonto, ControlePontoStatus, Funcionario } from "@/lib/types";
import { salvarPonto, deletePonto } from "@/app/(dashboard)/rh/ponto/actions";
import { formatDate } from "@/lib/format";
import { todayISO } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { usePodeEditarRh } from "@/components/rh/salarios-context";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const STATUS_LABEL: Record<ControlePontoStatus, string> = {
  normal: "Normal",
  falta: "Falta",
  falta_justificada: "Falta justificada",
  feriado: "Feriado",
  ferias: "Férias",
  atestado: "Atestado",
};

const STATUS_TONE: Record<ControlePontoStatus, ChipTone> = {
  normal: "emerald",
  falta: "rose",
  falta_justificada: "amber",
  feriado: "sky",
  ferias: "copper",
  atestado: "amber",
};

const STATUS_DOT: Record<ControlePontoStatus, string> = {
  normal: "bg-emerald-500",
  falta: "bg-rose-500",
  falta_justificada: "bg-amber-500",
  feriado: "bg-sky-500",
  ferias: "bg-copper-500",
  atestado: "bg-amber-500",
};

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

function PontoForm({
  funcionarioId,
  data,
  registro,
  onSaved,
}: {
  funcionarioId: string;
  data: string;
  registro?: ControlePonto;
  onSaved: () => void;
}) {
  const action = salvarPonto.bind(null, registro?.id ?? null);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, onSaved);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="funcionario_id" value={funcionarioId} />
      <input type="hidden" name="data" value={data} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Status</label>
          <select
            name="status"
            defaultValue={registro?.status ?? "normal"}
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
          <label className="text-xs font-medium text-zinc-400">Horas trabalhadas</label>
          <input
            name="horas_trabalhadas"
            type="number"
            step="0.01"
            min="0"
            defaultValue={registro?.horas_trabalhadas ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Entrada</label>
          <input
            name="entrada"
            type="time"
            defaultValue={registro?.entrada ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Saída almoço</label>
          <input
            name="saida_almoco"
            type="time"
            defaultValue={registro?.saida_almoco ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Volta almoço</label>
          <input
            name="volta_almoco"
            type="time"
            defaultValue={registro?.volta_almoco ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Saída</label>
          <input
            name="saida"
            type="time"
            defaultValue={registro?.saida ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Observações</label>
          <textarea
            name="observacoes"
            rows={2}
            defaultValue={registro?.observacoes ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        </div>
      </div>
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
      <div className="flex justify-between gap-2">
        {registro && (
          <button
            type="button"
            onClick={() => deletePonto(registro.id).then(onSaved)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-950/40"
          >
            Remover registro
          </button>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export function PontoBoard({
  registros,
  funcionarios,
}: {
  registros: ControlePonto[];
  funcionarios: Funcionario[];
}) {
  const podeEditar = usePodeEditarRh();
  const [funcionarioId, setFuncionarioId] = useState(funcionarios[0]?.id ?? "");
  const hoje = useMemo(() => todayISO(), []);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = hoje.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const registrosDoFuncionario = useMemo(
    () => registros.filter((r) => r.funcionario_id === funcionarioId),
    [registros, funcionarioId]
  );
  const registroByDate = useMemo(
    () => new Map(registrosDoFuncionario.map((r) => [r.data, r])),
    [registrosDoFuncionario]
  );

  const cells = useMemo(() => buildCells(cursor.year, cursor.month), [cursor]);
  const mesPrefix = `${cursor.year}-${pad(cursor.month + 1)}`;
  const registrosDoMes = registrosDoFuncionario.filter((r) => r.data.startsWith(mesPrefix));
  const totalHoras = registrosDoMes.reduce((sum, r) => sum + (r.horas_trabalhadas ?? 0), 0);
  const totalFaltas = registrosDoMes.filter(
    (r) => r.status === "falta" || r.status === "falta_justificada"
  ).length;

  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }
  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }
  function openDay(iso: string) {
    // Sem edição no RH o dia não abre o formulário de registro (a action também recusa).
    if (!podeEditar) return;
    setSelectedDate(iso);
    dialogRef.current?.showModal();
  }
  function closeDay() {
    dialogRef.current?.close();
  }

  const registroSelecionado = selectedDate ? registroByDate.get(selectedDate) : undefined;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Controle de Ponto</h1>
          <p className="text-sm text-zinc-500">{registros.length} registro(s) no total</p>
        </div>
      </div>

      {funcionarios.length > 0 ? (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <label className="text-xs text-zinc-500">Funcionário</label>
              <select
                value={funcionarioId}
                onChange={(e) => setFuncionarioId(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 outline-none"
              >
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id} className="bg-zinc-900">
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
              Total no mês: <span className="font-semibold text-zinc-200">{totalHoras.toFixed(1)}h</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
              Faltas no mês: <span className="font-semibold text-zinc-200">{totalFaltas}</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPrevMonth}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="w-40 text-center text-sm font-semibold text-zinc-100">
                  {MESES[cursor.month]} de {cursor.year}
                </h2>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="h-3.5 w-3.5" />
                {podeEditar ? "Clique em um dia para registrar" : "Somente leitura"}
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {DIAS_SEMANA.map((dia) => (
                <div
                  key={dia}
                  className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-600"
                >
                  {dia}
                </div>
              ))}

              {cells.map((cell) => {
                const registro = registroByDate.get(cell.iso);
                const isToday = cell.iso === hoje;
                const cellClass = cell.inMonth ? "border-zinc-800/80" : "border-zinc-900 bg-zinc-950/40";
                const dayNumberClass = !cell.inMonth
                  ? "text-zinc-700"
                  : isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-copper-600 text-white"
                    : "text-zinc-300";

                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => openDay(cell.iso)}
                    className={`flex min-h-[56px] flex-col items-start justify-between gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-copper-500/60 ${cellClass}`}
                  >
                    <span className={`text-xs font-medium ${dayNumberClass}`}>{cell.day}</span>
                    {registro && (
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[registro.status]}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-600">Cadastre funcionários ativos para registrar o ponto.</p>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setSelectedDate(null)}
        className="fixed inset-0 m-0 hidden h-full max-h-none w-full max-w-none open:flex items-center justify-center bg-transparent p-4 text-zinc-100 backdrop:bg-black/60"
      >
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-md flex-col overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {selectedDate && formatDate(selectedDate)}
              {registroSelecionado && (
                <StatusChip tone={STATUS_TONE[registroSelecionado.status]}>
                  {STATUS_LABEL[registroSelecionado.status]}
                </StatusChip>
              )}
            </h2>
            <button
              type="button"
              onClick={closeDay}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">
            {selectedDate && (
              <PontoForm
                key={selectedDate}
                funcionarioId={funcionarioId}
                data={selectedDate}
                registro={registroSelecionado}
                onSaved={closeDay}
              />
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
