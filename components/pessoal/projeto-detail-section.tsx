"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, X, Link2, Library, ListChecks } from "lucide-react";
import type {
  PessoalLibraryItem,
  PessoalProject,
  PessoalProjectLink,
  PessoalTask,
} from "@/lib/pessoal/types";
import { PROJECT_STATUSES, TASK_PRIORITIES } from "@/lib/pessoal/categories";
import {
  updatePessoalProjetoNome,
  updatePessoalProjetoDescricao,
  updatePessoalProjetoStatus,
  updatePessoalProjetoLinks,
  updatePessoalProjetoTags,
  deletePessoalProjeto,
} from "@/app/(dashboard)/pessoal/projetos/actions";
import { formatDate } from "@/lib/format";

function EditableName({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (value.trim() && value !== name) updatePessoalProjetoNome(id, value);
          else setValue(name);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        className="w-full rounded-lg border border-petrol-500 bg-zinc-950 px-2 py-1 text-lg font-semibold text-zinc-100 outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="rounded-lg px-2 py-1 text-left text-lg font-semibold text-zinc-100 hover:bg-zinc-900"
    >
      {name}
    </button>
  );
}

function DescriptionField({ id, description }: { id: string; description: string | null }) {
  const [value, setValue] = useState(description ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-400">Descrição</label>
        {saving && <span className="text-[11px] text-zinc-600">Salvando...</span>}
      </div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={async () => {
          if (value === (description ?? "")) return;
          setSaving(true);
          await updatePessoalProjetoDescricao(id, value);
          setSaving(false);
        }}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        placeholder="Notas, escopo, observações..."
      />
    </div>
  );
}

function LinksEditor({ id, links }: { id: string; links: PessoalProjectLink[] }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PessoalProjectLink[]>(links);

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">Links</label>
          <button
            type="button"
            onClick={() => {
              setDraft(links);
              setEditing(true);
            }}
            className="text-xs font-medium text-petrol-400 hover:text-petrol-300"
          >
            Editar
          </button>
        </div>
        {links.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 hover:border-petrol-500/60"
              >
                <Link2 className="h-3 w-3" />
                {link.label || link.url}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum link adicionado.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <label className="text-xs font-medium text-zinc-400">Links</label>
      {draft.map((link, i) => (
        <div key={i} className="flex gap-2">
          <input
            placeholder="Rótulo"
            value={link.label}
            onChange={(e) => {
              const next = [...draft];
              next[i] = { ...next[i], label: e.target.value };
              setDraft(next);
            }}
            className="w-28 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-petrol-500"
          />
          <input
            placeholder="https://..."
            value={link.url}
            onChange={(e) => {
              const next = [...draft];
              next[i] = { ...next[i], url: e.target.value };
              setDraft(next);
            }}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-petrol-500"
          />
          <button
            type="button"
            onClick={() => setDraft(draft.filter((_, idx) => idx !== i))}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setDraft([...draft, { label: "", url: "" }])}
        className="flex items-center gap-1 text-xs font-medium text-petrol-400 hover:text-petrol-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar link
      </button>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={async () => {
            await updatePessoalProjetoLinks(id, draft);
            setEditing(false);
          }}
          className="rounded-md bg-petrol-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-petrol-500"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function TagsEditor({ id, tags }: { id: string; tags: string[] }) {
  const [current, setCurrent] = useState(tags);
  const [input, setInput] = useState("");

  function addTag() {
    const tag = input.trim();
    if (!tag) return;
    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setInput("");
      return;
    }
    const next = [...current, tag];
    setCurrent(next);
    setInput("");
    updatePessoalProjetoTags(id, next);
  }

  function removeTag(tag: string) {
    const next = current.filter((t) => t !== tag);
    setCurrent(next);
    updatePessoalProjetoTags(id, next);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400">Tags</label>
      <div className="flex flex-wrap gap-1.5">
        {current.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            {tag}
            <button type="button" onClick={() => removeTag(tag)}>
              <X className="h-3 w-3 text-zinc-500 hover:text-rose-400" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => {
          if (e.target.value.endsWith(",")) {
            setInput(e.target.value.slice(0, -1));
            addTag();
            return;
          }
          setInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="Adicionar tag e Enter"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
      />
    </div>
  );
}

export function ProjetoDetailSection({
  projeto,
  itensBiblioteca,
  tarefas,
}: {
  projeto: PessoalProject;
  itensBiblioteca: PessoalLibraryItem[];
  tarefas: PessoalTask[];
}) {
  const [status, setStatus] = useState(projeto.status);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/pessoal/projetos"
        className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Projetos
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <EditableName id={projeto.id} name={projeto.name} />
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value as PessoalProject["status"];
              setStatus(next);
              updatePessoalProjetoStatus(projeto.id, next);
            }}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300 outline-none"
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <form action={deletePessoalProjeto.bind(null, projeto.id)}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <DescriptionField id={projeto.id} description={projeto.description} />
        <LinksEditor id={projeto.id} links={projeto.links} />
        <TagsEditor id={projeto.id} tags={projeto.tags ?? []} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Library className="h-4 w-4 text-zinc-500" />
            Itens da Biblioteca
          </h2>
          {itensBiblioteca.length > 0 ? (
            <div className="space-y-2">
              {itensBiblioteca.map((item) => (
                <Link
                  key={item.id}
                  href="/pessoal/biblioteca"
                  className="block truncate rounded-lg border border-zinc-800/80 px-3 py-2 text-sm text-zinc-300 hover:border-petrol-500/60"
                >
                  {item.title || item.url || "Sem título"}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">
              Nenhum item da biblioteca vinculado a este projeto.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <ListChecks className="h-4 w-4 text-zinc-500" />
            Tarefas
          </h2>
          {tarefas.length > 0 ? (
            <div className="space-y-2">
              {tarefas.map((tarefa) => {
                const prioridade = TASK_PRIORITIES.find(
                  (p) => p.value === tarefa.priority
                );
                return (
                  <Link
                    key={tarefa.id}
                    href="/pessoal/tarefas"
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 px-3 py-2 text-sm hover:border-petrol-500/60"
                  >
                    <span
                      className={`truncate ${
                        tarefa.status === "concluida"
                          ? "text-zinc-500 line-through"
                          : "text-zinc-300"
                      }`}
                    >
                      {tarefa.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {tarefa.due_date && (
                        <span className="text-[11px] text-zinc-600">
                          {formatDate(tarefa.due_date)}
                        </span>
                      )}
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: prioridade?.color }}
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">
              Nenhuma tarefa vinculada a este projeto.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
