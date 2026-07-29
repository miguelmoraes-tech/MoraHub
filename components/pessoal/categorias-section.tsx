"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Tags, Plus, Pencil, Trash2 } from "lucide-react";
import type { PessoalCategory } from "@/lib/pessoal/types";
import { CATEGORY_COLOR_PALETTE } from "@/lib/pessoal/categories";
import {
  createPessoalCategoria,
  updatePessoalCategoria,
  deletePessoalCategoria,
} from "@/app/(dashboard)/pessoal/categorias/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function ColorPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState(
    defaultValue ?? CATEGORY_COLOR_PALETTE[0]
  );

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-400">Cor</label>
      <input type="hidden" name={name} value={selected} />
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setSelected(color)}
            className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-zinc-950 transition-all ${
              selected === color ? "ring-2 ring-zinc-200" : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

function CategoriaFields({ categoria }: { categoria?: PessoalCategory }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="name"
          required
          defaultValue={categoria?.name}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo *</label>
        <select
          name="kind"
          defaultValue={categoria?.kind ?? "despesa"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-petrol-500 focus:ring-1 focus:ring-petrol-500"
        >
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
      </div>
      <div className="col-span-2">
        <ColorPicker name="color" defaultValue={categoria?.color ?? undefined} />
      </div>
    </div>
  );
}

function NewCategoriaForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createPessoalCategoria,
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
        Nova categoria
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <CategoriaFields />
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

function CategoriaRow({ categoria }: { categoria: PessoalCategory }) {
  const [editing, setEditing] = useState(false);
  const action = updatePessoalCategoria.bind(null, categoria.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <CategoriaFields categoria={categoria} />
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

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: categoria.color ?? "#89898d" }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm text-zinc-200">{categoria.name}</p>
          <p className="text-xs text-zinc-500">
            {categoria.kind === "receita" ? "Receita" : "Despesa"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deletePessoalCategoria.bind(null, categoria.id)}>
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

export function CategoriasSection({
  categorias,
}: {
  categorias: PessoalCategory[];
}) {
  const receitas = categorias.filter((c) => c.kind === "receita");
  const despesas = categorias.filter((c) => c.kind === "despesa");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Categorias</h1>
          <p className="text-sm text-zinc-500">
            {categorias.length} categoria(s) cadastrada(s)
          </p>
        </div>
        <NewCategoriaForm />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Tags className="h-4 w-4 text-zinc-500" />
            Despesas
          </div>
          {despesas.length > 0 ? (
            <div className="space-y-2">
              {despesas.map((categoria) => (
                <CategoriaRow key={categoria.id} categoria={categoria} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhuma categoria de despesa.</p>
          )}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
            <Tags className="h-4 w-4 text-zinc-500" />
            Receitas
          </div>
          {receitas.length > 0 ? (
            <div className="space-y-2">
              {receitas.map((categoria) => (
                <CategoriaRow key={categoria.id} categoria={categoria} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">Nenhuma categoria de receita.</p>
          )}
        </div>
      </div>
    </div>
  );
}
