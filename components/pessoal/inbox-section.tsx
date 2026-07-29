"use client";

import { useActionState, useState } from "react";
import { Inbox as InboxIcon, Library, Check, Trash2, Loader2 } from "lucide-react";
import type { PessoalInboxItem, PessoalProject } from "@/lib/pessoal/types";
import { fetchLinkMetadata, type LinkMetadata } from "@/lib/pessoal/link-metadata";
import {
  createPessoalInboxItem,
  markPessoalInboxTriaged,
  deletePessoalInboxItem,
  createPessoalBibliotecaFromInbox,
} from "@/app/(dashboard)/pessoal/inbox/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

type ProjetoOption = Pick<PessoalProject, "id" | "name">;

const URL_RE = /^https?:\/\/\S+$/i;

function Composer() {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!value.trim() || pending) return;
    setPending(true);
    await createPessoalInboxItem(value);
    setPending(false);
    setValue("");
  }

  return (
    <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Joga qualquer coisa aqui — uma ideia, um link, um lembrete... (Enter envia, Shift+Enter quebra linha)"
        rows={2}
        className="w-full resize-none bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={pending || !value.trim()}
          className="rounded-md bg-petrol-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-petrol-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Adicionar"}
        </button>
      </div>
    </div>
  );
}

function ConvertForm({
  item,
  projetos,
  metadata,
  onDone,
}: {
  item: PessoalInboxItem;
  projetos: ProjetoOption[];
  metadata: LinkMetadata | null;
  onDone: () => void;
}) {
  const action = createPessoalBibliotecaFromInbox.bind(null, item.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, onDone);

  const isUrl = URL_RE.test(item.content.trim());
  const defaultTitle = metadata?.title ?? (isUrl ? "" : item.content.slice(0, 117));
  const defaultUrl = metadata ? item.content.trim() : isUrl ? item.content.trim() : "";
  const defaultNotes = metadata?.description ?? (isUrl ? "" : item.content);

  return (
    <form
      action={formAction}
      className="mt-2 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <input type="hidden" name="item_type" value={metadata?.itemType ?? "link"} />
      <input type="hidden" name="thumbnail_url" value={metadata?.thumbnailUrl ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="title"
          defaultValue={defaultTitle}
          placeholder="Título"
          className="col-span-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
        />
        <input
          name="url"
          defaultValue={defaultUrl}
          placeholder="URL"
          className="col-span-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
        />
        <select
          name="project_id"
          defaultValue=""
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
        >
          <option value="">Sem projeto</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.name}
            </option>
          ))}
        </select>
        <input
          name="tags"
          placeholder="tags, separadas, por vírgula"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
        />
        <textarea
          name="notes"
          defaultValue={defaultNotes}
          rows={2}
          placeholder="Notas"
          className="col-span-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500"
        />
      </div>
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
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
          {pending ? "Salvando..." : "Salvar na Biblioteca"}
        </button>
      </div>
    </form>
  );
}

function InboxItemRow({
  item,
  projetos,
}: {
  item: PessoalInboxItem;
  projetos: ProjetoOption[];
}) {
  const [converting, setConverting] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);

  async function handleConvertClick() {
    const isUrl = URL_RE.test(item.content.trim());
    if (isUrl) {
      setLoadingMetadata(true);
      const result = await fetchLinkMetadata(item.content.trim());
      setLoadingMetadata(false);
      setMetadata(result);
    }
    setConverting(true);
  }

  return (
    <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="whitespace-pre-wrap text-sm text-zinc-200">{item.content}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {new Date(item.created_at).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleConvertClick}
            disabled={loadingMetadata}
            title="Converter em item de Biblioteca"
            className="flex items-center gap-1 rounded-md p-1.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {loadingMetadata ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Library className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => markPessoalInboxTriaged(item.id)}
            title="Marcar como triado"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-emerald-950/50 hover:text-emerald-400"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => deletePessoalInboxItem(item.id)}
            title="Excluir"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {converting && (
        <ConvertForm
          item={item}
          projetos={projetos}
          metadata={metadata}
          onDone={() => setConverting(false)}
        />
      )}
    </div>
  );
}

export function InboxSection({
  itens,
  projetos,
}: {
  itens: PessoalInboxItem[];
  projetos: ProjetoOption[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Inbox</h1>
        <p className="text-sm text-zinc-500">
          {itens.length} item(ns) não triado(s)
        </p>
      </div>

      <Composer />

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <InboxIcon className="h-4 w-4 text-zinc-500" />
          Pra organizar
        </div>

        {itens.length > 0 ? (
          <div className="space-y-2">
            {itens.map((item) => (
              <InboxItemRow key={item.id} item={item} projetos={projetos} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Inbox vazia.</p>
        )}
      </div>
    </div>
  );
}
