"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  List,
  Grid3x3,
} from "lucide-react";
import type { CalendarioItem } from "@/lib/vencimentos/types";
import {
  createVencimento,
  updateVencimento,
  deleteVencimento,
} from "@/app/(dashboard)/calendario/actions";
import { formatDate } from "@/lib/format";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { CalendarioGrid } from "@/components/calendario-grid";
import { TIPO_LABEL, TIPO_TONE } from "@/lib/vencimentos/labels";

function VencimentoFields({ item }: { item?: CalendarioItem }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={item?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={item?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Nota</label>
        <textarea
          name="nota"
          rows={2}
          defaultValue={item?.nota ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewVencimentoForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createVencimento,
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
        Novo vencimento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <VencimentoFields />
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

function CalendarioRow({ item, hoje }: { item: CalendarioItem; hoje: string }) {
  const [editing, setEditing] = useState(false);
  const isManual = item.tipo === "vencimento";
  const action = updateVencimento.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing && isManual) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <VencimentoFields item={item} />
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

  const dias = diffInDays(hoje, item.data);
  const atrasado = dias < 0;
  const proximo = dias >= 0 && dias <= 7;

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
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {item.href ? (
            <Link
              href={item.href}
              className="truncate hover:text-copper-400 hover:underline"
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
        <p className="text-xs text-zinc-500">
          {formatDate(item.data)}
          {atrasado ? " (atrasado)" : proximo ? " (em breve)" : ""}
          {item.nota && ` · ${item.nota}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.href && !isManual && (
          <Link
            href={item.href}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
        {isManual && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteVencimento.bind(null, item.id)}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function CalendarioBoard({ itens }: { itens: CalendarioItem[] }) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const hoje = useMemo(() => todayISO(), []);
  const ordenados = useMemo(
    () => [...itens].sort((a, b) => a.data.localeCompare(b.data)),
    [itens]
  );

  return (
    <div
      className={`mx-auto px-6 py-8 ${view === "calendario" ? "max-w-5xl" : "max-w-4xl"}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Calendário de Vencimentos
          </h1>
          <p className="text-sm text-zinc-500">{ordenados.length} item(ns)</p>
        </div>
        <NewVencimentoForm />
      </div>

      <div data-faixa-abas className="mb-6 inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        <button
          type="button"
          onClick={() => setView("lista")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            view === "lista"
              ? "bg-copper-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <List className="h-3.5 w-3.5" />
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView("calendario")}
          className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
            view === "calendario"
              ? "bg-copper-600 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Grid3x3 className="h-3.5 w-3.5" />
          Calendário
        </button>
      </div>

      {view === "lista" ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <CalendarClock className="h-4 w-4 text-zinc-500" />
            Próximos vencimentos
          </div>

          {ordenados.length > 0 ? (
            <div className="space-y-2">
              {ordenados.map((item) => (
                <CalendarioRow key={item.id} item={item} hoje={hoje} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">
              Nenhum vencimento cadastrado.
            </p>
          )}
        </div>
      ) : (
        <CalendarioGrid itens={itens} />
      )}
    </div>
  );
}
