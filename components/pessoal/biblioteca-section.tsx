"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Library, Plus, Pencil, Trash2, Search } from "lucide-react";
import type {
  PessoalLibraryItem,
  PessoalLibraryItemStatus,
  PessoalProject,
} from "@/lib/pessoal/types";
import { LIBRARY_ITEM_TYPES, LIBRARY_STATUSES } from "@/lib/pessoal/categories";
import { fetchLinkMetadata, type LinkMetadata } from "@/lib/pessoal/link-metadata";
import { tagsToInput } from "@/lib/pessoal/tags";
import {
  createPessoalBiblioteca,
  updatePessoalBiblioteca,
  updatePessoalBibliotecaStatus,
  deletePessoalBiblioteca,
} from "@/app/(dashboard)/pessoal/biblioteca/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

type ProjetoOption = Pick<PessoalProject, "id" | "name">;

function ItemFields({
  item,
  projetos,
  initialUrl,
  initialMetadata,
}: {
  item?: PessoalLibraryItem;
  projetos: ProjetoOption[];
  initialUrl?: string;
  initialMetadata?: LinkMetadata | null;
}) {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(
    initialMetadata ?? null
  );
  const [fetching, setFetching] = useState(false);

  async function handleFetchMetadata() {
    const urlInput = (document.getElementById("biblioteca-url-input") as HTMLInputElement)
      ?.value;
    if (!urlInput) return;
    setFetching(true);
    const result = await fetchLinkMetadata(urlInput);
    setFetching(false);
    if (result) setMetadata(result);
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1 sm:col-span-3">
        <label className="text-xs font-medium text-zinc-400">URL</label>
        <div className="flex gap-2">
          <input
            id="biblioteca-url-input"
            name="url"
            defaultValue={item?.url ?? initialUrl ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
          />
          <button
            type="button"
            onClick={handleFetchMetadata}
            disabled={fetching}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" />
            {fetching ? "Buscando..." : "Buscar metadata"}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo *</label>
        <select
          name="item_type"
          defaultValue={item?.item_type ?? metadata?.itemType ?? "link"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {LIBRARY_ITEM_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-3">
        <label className="text-xs font-medium text-zinc-400">Título</label>
        <input
          name="title"
          key={metadata?.title ?? "title"}
          defaultValue={item?.title ?? metadata?.title ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <input
        type="hidden"
        name="thumbnail_url"
        value={item?.thumbnail_url ?? metadata?.thumbnailUrl ?? ""}
      />
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Projeto</label>
        <select
          name="project_id"
          defaultValue={item?.project_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="">Nenhum</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-zinc-400">
          Tags (separadas por vírgula)
        </label>
        <input
          name="tags"
          defaultValue={tagsToInput(item?.tags)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="col-span-4 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Notas</label>
        <textarea
          name="notes"
          rows={2}
          key={metadata?.description ?? "notes"}
          defaultValue={item?.notes ?? metadata?.description ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
    </div>
  );
}

function ItemForm({
  item,
  projetos,
  initialUrl,
  initialMetadata,
  onDone,
}: {
  item?: PessoalLibraryItem;
  projetos: ProjetoOption[];
  initialUrl?: string;
  initialMetadata?: LinkMetadata | null;
  onDone: () => void;
}) {
  const action = item
    ? updatePessoalBiblioteca.bind(null, item.id)
    : createPessoalBiblioteca;
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, onDone);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ItemFields
        item={item}
        projetos={projetos}
        initialUrl={initialUrl}
        initialMetadata={initialMetadata}
      />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
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

function LinkPasteBar({
  onMetadata,
}: {
  onMetadata: (url: string, metadata: LinkMetadata | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    const metadata = await fetchLinkMetadata(url.trim());
    setLoading(false);
    onMetadata(url.trim(), metadata);
    setUrl("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2"
    >
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Cole um link (YouTube, artigo, e-book...) e aperte Enter"
        className="w-full bg-transparent px-2 py-1.5 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      <button
        type="submit"
        disabled={loading}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-petrol-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" />
        {loading ? "Buscando..." : "Adicionar"}
      </button>
    </form>
  );
}

function ItemCard({
  item,
  projetos,
}: {
  item: PessoalLibraryItem;
  projetos: ProjetoOption[];
}) {
  const [editing, setEditing] = useState(false);
  const tipo = LIBRARY_ITEM_TYPES.find((t) => t.value === item.item_type);
  const Icon = tipo?.icon ?? Library;
  const projeto = projetos.find((p) => p.id === item.project_id);

  if (editing) {
    return (
      <ItemForm item={item} projetos={projetos} onDone={() => setEditing(false)} />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/40">
      {item.thumbnail_url && (
        <div className="relative h-32 w-full bg-zinc-900">
          <Image
            src={item.thumbnail_url}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
        </div>
      )}
      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm text-zinc-200">
            <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className="line-clamp-2">
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-petrol-400 hover:underline"
                >
                  {item.title || item.url}
                </a>
              ) : (
                item.title || "Sem título"
              )}
            </span>
          </p>
        </div>

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {projeto && (
          <p className="text-[11px] text-zinc-500">Projeto: {projeto.name}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <select
            value={item.status}
            onChange={(e) =>
              updatePessoalBibliotecaStatus(
                item.id,
                e.target.value as PessoalLibraryItemStatus
              )
            }
            className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            {LIBRARY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deletePessoalBiblioteca.bind(null, item.id)}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BibliotecaSection({
  itens,
  projetos,
}: {
  itens: PessoalLibraryItem[];
  projetos: ProjetoOption[];
}) {
  const [tab, setTab] = useState<PessoalLibraryItemStatus>("para_ver");
  const [pending, setPending] = useState<{
    url: string;
    metadata: LinkMetadata | null;
  } | null>(null);

  const grouped: Record<PessoalLibraryItemStatus, PessoalLibraryItem[]> = {
    para_ver: [],
    vendo: [],
    concluido: [],
  };
  for (const item of itens) {
    const status = grouped[item.status] ? item.status : "para_ver";
    grouped[status].push(item);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Biblioteca</h1>
        <p className="text-sm text-zinc-500">
          {itens.length} item(ns) salvo(s) pra consumir depois
        </p>
      </div>

      <LinkPasteBar onMetadata={(url, metadata) => setPending({ url, metadata })} />

      {pending && (
        <div className="mb-6">
          <ItemForm
            projetos={projetos}
            initialUrl={pending.url}
            initialMetadata={pending.metadata}
            onDone={() => setPending(null)}
          />
        </div>
      )}

      <div data-faixa-abas className="mb-6 inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {LIBRARY_STATUSES.map((status) => (
          <button
            key={status.value}
            type="button"
            onClick={() => setTab(status.value)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === status.value
                ? "bg-petrol-600 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {status.label} ({grouped[status.value].length})
          </button>
        ))}
      </div>

      {grouped[tab].length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {grouped[tab].map((item) => (
            <ItemCard key={item.id} item={item} projetos={projetos} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Library className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum item nesta lista.</p>
        </div>
      )}
    </div>
  );
}
