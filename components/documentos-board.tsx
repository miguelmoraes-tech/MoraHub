"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Paperclip,
} from "lucide-react";
import type { Cliente, Documento, DocumentoCategoria } from "@/lib/types";
import {
  createDocumento,
  updateDocumento,
  deleteDocumento,
} from "@/app/(dashboard)/documentos/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";

export type DocumentoComArquivo = Documento & { arquivoUrl: string | null };

const CATEGORIAS: DocumentoCategoria[] = [
  "Contrato",
  "Proposta",
  "Briefing",
  "Nota fiscal",
  "Arquivo do cliente",
  "Outro",
];

const TIPO_OPTIONS = ["Link", "Nota"];

function DocumentoFields({
  documento,
  clientes,
}: {
  documento?: Documento;
  clientes: Cliente[];
}) {
  const [tipo, setTipo] = useState<"link" | "nota">(documento?.tipo ?? "link");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={documento?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "link" | "nota")}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="link">Link</option>
          <option value="nota">Nota</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria</label>
        <select
          name="categoria"
          defaultValue={documento?.categoria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhuma</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Cliente (opcional)
        </label>
        <select
          name="cliente_id"
          defaultValue={documento?.cliente_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Documento geral (sem cliente)</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data</label>
        <input
          name="data"
          type="date"
          defaultValue={documento?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          {tipo === "link" ? "URL do link" : "Nota"}
        </label>
        {tipo === "link" ? (
          <input
            name="conteudo"
            defaultValue={documento?.conteudo ?? ""}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        ) : (
          <textarea
            name="conteudo"
            rows={2}
            defaultValue={documento?.conteudo ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        )}
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Arquivo {documento?.arquivo_path ? "(substituir)" : "(opcional)"}
        </label>
        <input
          name="arquivo"
          type="file"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-400 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-zinc-200 focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewDocumentoForm({ clientes }: { clientes: Cliente[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createDocumento,
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
      <DocumentoFields clientes={clientes} />
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

function DocumentoRow({
  documento,
  clientes,
}: {
  documento: DocumentoComArquivo;
  clientes: Cliente[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateDocumento.bind(null, documento.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <DocumentoFields documento={documento} clientes={clientes} />
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

  const cliente = clientes.find((c) => c.id === documento.cliente_id);

  return (
    <div
      id={`documento-${documento.id}`}
      className="scroll-mt-6 flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {documento.titulo}
          {documento.categoria && (
            <StatusChip tone="copper">{documento.categoria}</StatusChip>
          )}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {cliente ? (
            <Link
              href={`/clientes/${cliente.id}`}
              className="hover:text-copper-400 hover:underline"
            >
              {cliente.nome}
            </Link>
          ) : (
            "Documento geral"
          )}
          {documento.data && ` · ${formatDate(documento.data)}`}
          {documento.tipo === "nota" && documento.conteudo && ` · ${documento.conteudo}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {documento.tipo === "link" && documento.conteudo && (
          <a
            href={documento.conteudo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {documento.arquivoUrl && (
          <a
            href={documento.arquivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteDocumento.bind(null, documento.id)}>
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

export function DocumentosBoard({
  documentos,
  clientes,
}: {
  documentos: DocumentoComArquivo[];
  clientes: Cliente[];
}) {
  const [categoria, setCategoria] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"" | "link" | "nota">("");

  const porCategoria = categoria
    ? documentos.filter((d) => d.categoria === categoria)
    : documentos;
  const filtrados = tipoFiltro
    ? porCategoria.filter((d) => d.tipo === tipoFiltro)
    : porCategoria;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Documentos</h1>
          <p className="text-sm text-zinc-500">
            {filtrados.length} documento(s)
          </p>
        </div>
        <NewDocumentoForm clientes={clientes} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={categoria}
          options={CATEGORIAS}
          allLabel="Todas as categorias"
          onChange={setCategoria}
        />
        <SegmentFilter
          value={tipoFiltro === "link" ? "Link" : tipoFiltro === "nota" ? "Nota" : ""}
          options={TIPO_OPTIONS}
          allLabel="Todos os tipos"
          onChange={(value) =>
            setTipoFiltro(value === "Link" ? "link" : value === "Nota" ? "nota" : "")
          }
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileText className="h-4 w-4 text-zinc-500" />
          Todos os documentos
        </div>

        {filtrados.length > 0 ? (
          <div className="space-y-2">
            {filtrados.map((documento) => (
              <DocumentoRow
                key={documento.id}
                documento={documento}
                clientes={clientes}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum documento cadastrado.</p>
        )}
      </div>
    </div>
  );
}
