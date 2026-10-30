"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, ExternalLink, List, Grid3x3 } from "lucide-react";
import type { CalendarioConteudo } from "@/lib/types";
import type { Responsavel } from "@/lib/marketing/get-responsaveis";
import {
  createConteudo,
  updateConteudo,
  deleteConteudo,
} from "@/app/(dashboard)/marketing/calendario/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { ConteudoFields } from "@/components/marketing/conteudo-fields";
import { ConteudoCalendarioGrid } from "@/components/marketing/conteudo-calendario-grid";
import {
  CONTEUDO_TIPO_LABEL,
  CONTEUDO_CANAL_LABEL,
  CONTEUDO_STATUS_LABEL,
  CONTEUDO_STATUS_TONE,
} from "@/components/marketing/conteudo-labels";

function NewConteudoForm({ responsaveis }: { responsaveis: Responsavel[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createConteudo, undefined);

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
        Novo conteúdo
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ConteudoFields responsaveis={responsaveis} />
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

function ConteudoRow({
  item,
  responsaveis,
  somenteLeitura,
}: {
  item: CalendarioConteudo;
  responsaveis: Responsavel[];
  somenteLeitura: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateConteudo.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ConteudoFields item={item} responsaveis={responsaveis} />
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

  const responsavelNome = item.responsavel_id
    ? (responsaveis.find((r) => r.id === item.responsavel_id)?.nome ?? null)
    : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {item.titulo}
          <StatusChip tone={CONTEUDO_STATUS_TONE[item.status]}>
            {CONTEUDO_STATUS_LABEL[item.status]}
          </StatusChip>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {CONTEUDO_TIPO_LABEL[item.tipo]} · {CONTEUDO_CANAL_LABEL[item.canal]}
          {item.data_publicacao && ` · ${formatDate(item.data_publicacao)}`}
          {responsavelNome && ` · ${responsavelNome}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.link_publicado && (
          <a
            href={item.link_publicado}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {!somenteLeitura && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteConteudo.bind(null, item.id)}>
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

export function CalendarioConteudoBoard({
  itens,
  responsaveis,
  somenteLeitura = false,
}: {
  itens: CalendarioConteudo[];
  responsaveis: Responsavel[];
  somenteLeitura?: boolean;
}) {
  const [view, setView] = useState<"lista" | "calendario">("lista");
  const [canal, setCanal] = useState("");
  const [status, setStatus] = useState("");

  const filtrados = useMemo(() => {
    return itens.filter((item) => {
      if (canal && CONTEUDO_CANAL_LABEL[item.canal] !== canal) return false;
      if (status && CONTEUDO_STATUS_LABEL[item.status] !== status) return false;
      return true;
    });
  }, [itens, canal, status]);

  const ordenados = useMemo(
    () =>
      [...filtrados].sort((a, b) =>
        (a.data_publicacao ?? "9999").localeCompare(b.data_publicacao ?? "9999")
      ),
    [filtrados]
  );

  return (
    <div
      className={`mx-auto px-6 py-8 ${view === "calendario" ? "max-w-5xl" : "max-w-4xl"}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Calendário de Conteúdo</h1>
          <p className="text-sm text-zinc-500">{ordenados.length} item(ns)</p>
        </div>
        {!somenteLeitura && <NewConteudoForm responsaveis={responsaveis} />}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
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

        <SegmentFilter
          value={canal}
          options={Object.values(CONTEUDO_CANAL_LABEL)}
          allLabel="Todos os canais"
          onChange={setCanal}
        />
        <SegmentFilter
          value={status}
          options={Object.values(CONTEUDO_STATUS_LABEL)}
          allLabel="Todos os status"
          onChange={setStatus}
        />
      </div>

      {view === "lista" ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            Itens do calendário
          </div>

          {ordenados.length > 0 ? (
            <div className="space-y-2">
              {ordenados.map((item) => (
                <ConteudoRow
                  key={item.id}
                  item={item}
                  responsaveis={responsaveis}
                  somenteLeitura={somenteLeitura}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhum item de conteúdo cadastrado.</p>
          )}
        </div>
      ) : (
        <ConteudoCalendarioGrid
          itens={filtrados}
          responsaveis={responsaveis}
          somenteLeitura={somenteLeitura}
        />
      )}
    </div>
  );
}
