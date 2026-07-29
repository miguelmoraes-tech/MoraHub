"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CalendarioItem } from "@/lib/vencimentos/types";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { formatDate } from "@/lib/format";
import { StatusChip } from "@/components/status-chip";
import { TIPO_LABEL, TIPO_TONE } from "@/lib/vencimentos/labels";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
    cells.push({
      iso: isoOf(nextYear, nextMonthIndex, nextDay),
      day: nextDay,
      inMonth: false,
    });
    nextDay++;
  }

  return cells;
}

export function CalendarioGrid({ itens }: { itens: CalendarioItem[] }) {
  const hoje = useMemo(() => todayISO(), []);
  const [cursor, setCursor] = useState(() => {
    const [y, m] = hoje.split("-").map(Number);
    return { year: y, month: m - 1 };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarioItem[]>();
    for (const item of itens) {
      const list = map.get(item.data) ?? [];
      list.push(item);
      map.set(item.data, list);
    }
    return map;
  }, [itens]);

  const cells = useMemo(
    () => buildCells(cursor.year, cursor.month),
    [cursor]
  );

  function goToPrevMonth() {
    setCursor((c) =>
      c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }
    );
  }

  function goToNextMonth() {
    setCursor((c) =>
      c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }
    );
  }

  function goToToday() {
    const [y, m] = hoje.split("-").map(Number);
    setCursor({ year: y, month: m - 1 });
  }

  function openDay(iso: string) {
    setSelectedDate(iso);
    dialogRef.current?.showModal();
  }

  const selectedItems = selectedDate ? (itemsByDate.get(selectedDate) ?? []) : [];

  return (
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
        <button
          type="button"
          onClick={goToToday}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          Hoje
        </button>
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
          const itemsDoDia = itemsByDate.get(cell.iso) ?? [];
          const count = itemsDoDia.length;
          const dias = diffInDays(hoje, cell.iso);
          const atrasado = count > 0 && dias < 0;
          const proximo = count > 0 && dias >= 0 && dias <= 7;
          const isToday = cell.iso === hoje;

          const cellClass = atrasado
            ? "border-rose-800/60 bg-rose-950/20"
            : proximo
              ? "border-amber-800/60 bg-amber-950/20"
              : cell.inMonth
                ? "border-zinc-800/80"
                : "border-zinc-900 bg-zinc-950/40";

          const badgeClass = atrasado
            ? "bg-rose-500 text-white"
            : proximo
              ? "bg-amber-500 text-zinc-950"
              : "bg-zinc-700 text-zinc-200";

          const dayNumberClass = !cell.inMonth
            ? "text-zinc-700"
            : isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-copper-600 text-white"
              : "text-zinc-300";

          const content = (
            <>
              <span className={`text-xs font-medium ${dayNumberClass}`}>
                {cell.day}
              </span>
              {count > 0 && (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center self-start rounded-full px-1 text-[10px] font-semibold ${badgeClass}`}
                >
                  {count}
                </span>
              )}
            </>
          );

          if (count > 0) {
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => openDay(cell.iso)}
                className={`flex min-h-[64px] flex-col items-start justify-between gap-1 rounded-lg border p-1.5 text-left transition-colors hover:border-copper-500/60 sm:min-h-[84px] ${cellClass}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={cell.iso}
              className={`flex min-h-[64px] flex-col items-start justify-between gap-1 rounded-lg border p-1.5 sm:min-h-[84px] ${cellClass}`}
            >
              {content}
            </div>
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
            <h2 className="text-sm font-semibold">
              {selectedDate && formatDate(selectedDate)}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 text-zinc-500 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 px-5 py-4">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-zinc-800/80 px-3 py-2.5"
                >
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="hover:text-copper-400 hover:underline"
                      >
                        {item.titulo}
                      </Link>
                    ) : (
                      item.titulo
                    )}
                    <StatusChip tone={TIPO_TONE[item.tipo]}>
                      {TIPO_LABEL[item.tipo]}
                    </StatusChip>
                  </p>
                  {item.nota && (
                    <p className="mt-1 text-xs text-zinc-500">{item.nota}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-600">
                Nenhum vencimento nesta data.
              </p>
            )}
          </div>
        </div>
      </dialog>
    </div>
  );
}
