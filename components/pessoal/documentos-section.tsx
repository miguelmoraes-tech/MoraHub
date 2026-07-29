"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Plus, Pencil, Trash2, Download, Paperclip } from "lucide-react";
import type { PessoalDocument } from "@/lib/pessoal/types";
import { DOCUMENT_CATEGORIES } from "@/lib/pessoal/categories";
import { getExpiryBadge } from "@/lib/pessoal/expiry";
import { tagsToInput } from "@/lib/pessoal/tags";
import {
  createPessoalDocumento,
  updatePessoalDocumento,
  deletePessoalDocumento,
} from "@/app/(dashboard)/pessoal/documentos/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";

export type PessoalDocumentoComArquivo = PessoalDocument & {
  arquivoUrl: string | null;
};

function DocumentoFields({ documento }: { documento?: PessoalDocumentoComArquivo }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={documento?.name}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria *</label>
        <select
          name="category"
          defaultValue={documento?.category ?? "pessoal"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Data de expiração
        </label>
        <input
          name="expires_at"
          type="date"
          defaultValue={documento?.expires_at ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tags (separadas por vírgula)
        </label>
        <input
          name="tags"
          defaultValue={tagsToInput(documento?.tags)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Arquivo {documento ? "(opcional, substitui o atual)" : ""}
        </label>
        <input
          name="file"
          type="file"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-400 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:text-zinc-200"
        />
      </div>
      <div className="col-span-4 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Notas</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={documento?.notes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
    </div>
  );
}

function NewDocumentoForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalDocumento,
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
        className="flex items-center gap-1.5 rounded-lg bg-petrol-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-petrol-500"
      >
        <Plus className="h-4 w-4" />
        Novo documento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <DocumentoFields />
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
          className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function DocumentoRow({ documento }: { documento: PessoalDocumentoComArquivo }) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalDocumento.bind(null, documento.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <DocumentoFields documento={documento} />
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

  const categoria = DOCUMENT_CATEGORIES.find((c) => c.value === documento.category);
  const badge = getExpiryBadge(documento.expires_at);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-petrol-500/10 text-petrol-400">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
            {documento.name}
            {badge && <StatusChip tone={badge.tone}>{badge.label}</StatusChip>}
          </p>
          <p className="text-xs text-zinc-500">
            {categoria?.label}
            {documento.expires_at && ` · vence em ${formatDate(documento.expires_at)}`}
            {documento.tags && documento.tags.length > 0 && ` · ${documento.tags.join(", ")}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {documento.arquivoUrl && (
          <a
            href={documento.arquivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            title="Baixar arquivo"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deletePessoalDocumento.bind(null, documento.id)}>
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

export function DocumentosSection({
  documentos,
}: {
  documentos: PessoalDocumentoComArquivo[];
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  const categoriaLabels = DOCUMENT_CATEGORIES.map((c) => c.label);

  const filtrados = useMemo(() => {
    const base = categoriaFiltro
      ? documentos.filter(
          (d) =>
            DOCUMENT_CATEGORIES.find((c) => c.value === d.category)?.label ===
            categoriaFiltro
        )
      : documentos;

    return [...base].sort((a, b) => {
      if (!a.expires_at) return 1;
      if (!b.expires_at) return -1;
      return a.expires_at.localeCompare(b.expires_at);
    });
  }, [documentos, categoriaFiltro]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Documentos</h1>
          <p className="text-sm text-zinc-500">
            {documentos.length} documento(s) cadastrado(s)
          </p>
        </div>
        <NewDocumentoForm />
      </div>

      <div className="mb-4">
        <SegmentFilter
          value={categoriaFiltro}
          options={categoriaLabels}
          allLabel="Todas as categorias"
          onChange={setCategoriaFiltro}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Paperclip className="h-4 w-4 text-zinc-500" />
          Todos os documentos
        </div>

        {filtrados.length > 0 ? (
          <div className="space-y-2">
            {filtrados.map((documento) => (
              <DocumentoRow key={documento.id} documento={documento} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum documento cadastrado.</p>
        )}
      </div>
    </div>
  );
}
