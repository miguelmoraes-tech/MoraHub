// Gerado a partir de components/colaborador/modelos-contrato-board.tsx para a empresa ativa (sem conta de
// outro dono): a origem do dono é a empresa, e a escrita fecha em modo leitura.
"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  FileStack,
  Plus,
  Pencil,
  Trash2,
  Paperclip,
  Search,
  Info,
} from "lucide-react";
import type { ModeloContrato } from "@/lib/types";
import {
  createModeloContrato,
  updateModeloContrato,
  deleteModeloContrato,
} from "@/app/(dashboard)/juridico/modelos-contrato/actions";
import { tagsToInput } from "@/lib/pessoal/tags";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";

export type ModeloContratoComArquivo = ModeloContrato & {
  arquivoUrl: string | null;
};

const PLACEHOLDER_HELP =
  "Use [NOME_CLIENTE], [CPF_CNPJ], [VALOR], [DATA_INICIO], [DATA_FIM], [OBJETO_CONTRATO], etc. como campos que serão preenchidos depois.";

function Fields({
  modelo,
  categoriasExistentes,
}: {
  modelo?: ModeloContratoComArquivo;
  categoriasExistentes: string[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={modelo?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria</label>
        <input
          name="categoria"
          list="modelo-categorias"
          placeholder="Ex: Prestação de Serviço"
          defaultValue={modelo?.categoria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
        <datalist id="modelo-categorias">
          {categoriasExistentes.map((categoria) => (
            <option key={categoria} value={categoria} />
          ))}
        </datalist>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tags (separadas por vírgula)
        </label>
        <input
          name="tags"
          defaultValue={tagsToInput(modelo?.tags)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Conteúdo</label>
        <textarea
          name="conteudo"
          rows={10}
          defaultValue={modelo?.conteudo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
        <p className="flex items-start gap-1.5 text-[11px] text-zinc-500">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {PLACEHOLDER_HELP}
        </p>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Arquivo {modelo?.arquivo_path ? "(substituir)" : "(opcional, alternativa ao conteúdo em texto)"}
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

function NewForm({ categoriasExistentes }: { categoriasExistentes: string[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createModeloContrato,
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
        Novo modelo
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields categoriasExistentes={categoriasExistentes} />
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

function ModeloCard({
  modelo,
  categoriasExistentes,
  somenteLeitura,
}: {
  modelo: ModeloContratoComArquivo;
  categoriasExistentes: string[];
  somenteLeitura: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateModeloContrato.bind(null, modelo.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 sm:col-span-2 lg:col-span-3"
      >
        <Fields modelo={modelo} categoriasExistentes={categoriasExistentes} />
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

  const preview = modelo.conteudo ? modelo.conteudo.slice(0, 160) : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-zinc-200">
          <FileStack className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="line-clamp-1">{modelo.titulo}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {modelo.arquivoUrl && (
            <a
              href={modelo.arquivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Paperclip className="h-3.5 w-3.5" />
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
              <form action={deleteModeloContrato.bind(null, modelo.id)}>
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

      <div className="flex flex-wrap items-center gap-1.5">
        {modelo.categoria && (
          <StatusChip tone="copper">{modelo.categoria}</StatusChip>
        )}
        {modelo.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {preview && (
        <p className="line-clamp-3 whitespace-pre-line text-xs text-zinc-500">
          {preview}
          {modelo.conteudo && modelo.conteudo.length > 160 ? "…" : ""}
        </p>
      )}

      <p className="mt-auto text-[11px] text-zinc-600">
        Atualizado{" "}
        {formatDate(modelo.updated_at.slice(0, 10))}
      </p>
    </div>
  );
}

export function ModelosContratoBoard({
  modelos,
  somenteLeitura = false,
}: {
  modelos: ModeloContratoComArquivo[];
  somenteLeitura?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tag, setTag] = useState("");

  const categoriasExistentes = useMemo(
    () =>
      [...new Set(modelos.map((m) => m.categoria).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [modelos]
  );

  const tagsExistentes = useMemo(
    () => [...new Set(modelos.flatMap((m) => m.tags))].sort((a, b) => a.localeCompare(b)),
    [modelos]
  );

  const filtrados = modelos.filter((modelo) => {
    if (categoria && modelo.categoria !== categoria) return false;
    if (tag && !modelo.tags.includes(tag)) return false;
    if (busca && !modelo.titulo.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Modelos de Contrato
          </h1>
          <p className="text-sm text-zinc-500">
            {filtrados.length} de {modelos.length} modelo(s)
          </p>
        </div>
        {!somenteLeitura && <NewForm categoriasExistentes={categoriasExistentes} />}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
          <Search className="h-3.5 w-3.5 text-zinc-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título"
            className="bg-transparent text-sm text-zinc-300 outline-none placeholder:text-zinc-600"
          />
        </div>
        <SegmentFilter
          value={categoria}
          options={categoriasExistentes}
          allLabel="Todas as categorias"
          onChange={setCategoria}
        />
        {tagsExistentes.length > 0 && (
          <SegmentFilter
            value={tag}
            options={tagsExistentes}
            allLabel="Todas as tags"
            onChange={setTag}
          />
        )}
      </div>

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((modelo) => (
            <ModeloCard
              key={modelo.id}
              modelo={modelo}
              categoriasExistentes={categoriasExistentes}
              somenteLeitura={somenteLeitura}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-xs text-zinc-600">Nenhum modelo encontrado.</p>
        </div>
      )}
    </div>
  );
}
