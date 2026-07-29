"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, Link2 } from "lucide-react";
import type { PessoalProject, PessoalProjectStatus } from "@/lib/pessoal/types";
import { PROJECT_STATUSES } from "@/lib/pessoal/categories";
import { createPessoalProjeto } from "@/app/(dashboard)/pessoal/projetos/actions";
import { formatDate } from "@/lib/format";

function NewProjetoForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalProjeto,
    undefined
  );

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
        Novo projeto
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <div className="flex-1 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          autoFocus
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue="planejamento"
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          {PROJECT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
      {state && "error" in state && (
        <p className="w-full text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex gap-2">
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
          {pending ? "Criando..." : "Criar e abrir"}
        </button>
      </div>
    </form>
  );
}

function ProjetoCard({ projeto }: { projeto: PessoalProject }) {
  const status = PROJECT_STATUSES.find((s) => s.value === projeto.status);

  return (
    <Link
      href={`/pessoal/projetos/${projeto.id}`}
      className="block rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3 transition-colors hover:border-petrol-500/60"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-200">{projeto.name}</p>
        {projeto.links.length > 0 && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            <Link2 className="h-3 w-3" />
            {projeto.links.length}
          </span>
        )}
      </div>
      {projeto.description && (
        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
          {projeto.description}
        </p>
      )}
      {projeto.tags && projeto.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {projeto.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-2 text-[11px] text-zinc-600">
        {status?.label} · atualizado em {formatDate(projeto.updated_at.slice(0, 10))}
      </p>
    </Link>
  );
}

export function ProjetosSection({ projetos }: { projetos: PessoalProject[] }) {
  const [tab, setTab] = useState<PessoalProjectStatus | "todos">("todos");
  const [tagFiltro, setTagFiltro] = useState("");

  const allTags = [...new Set(projetos.flatMap((p) => p.tags ?? []))].sort((a, b) =>
    a.localeCompare(b)
  );

  const porTag = tagFiltro ? projetos.filter((p) => p.tags?.includes(tagFiltro)) : projetos;
  const filtrados = tab === "todos" ? porTag : porTag.filter((p) => p.status === tab);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Projetos Pessoais</h1>
          <p className="text-sm text-zinc-500">
            {projetos.length} projeto(s) cadastrado(s)
          </p>
        </div>
      </div>

      <NewProjetoForm />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setTab("todos")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "todos" ? "bg-petrol-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Todos ({projetos.length})
          </button>
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => setTab(status.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === status.value
                  ? "bg-petrol-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {status.label} ({projetos.filter((p) => p.status === status.value).length})
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <select
            value={tagFiltro}
            onChange={(e) => setTagFiltro(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none"
          >
            <option value="">Todas as tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((projeto) => (
            <ProjetoCard key={projeto.id} projeto={projeto} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <FolderKanban className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum projeto encontrado.</p>
        </div>
      )}
    </div>
  );
}
