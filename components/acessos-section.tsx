"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { KeyRound, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Acesso } from "@/lib/types";
import {
  createAcesso,
  updateAcesso,
  deleteAcesso,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip } from "@/components/status-chip";

const CATEGORIAS = [
  "Hospedagem",
  "Domínio",
  "Google",
  "Meta",
  "Cloudflare",
  "GitHub",
  "WordPress",
  "VPS",
  "Shopify",
  "Outro",
] as const;

function AcessoFields({ acesso }: { acesso?: Acesso }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Nome do serviço *
        </label>
        <input
          name="nome_servico"
          required
          defaultValue={acesso?.nome_servico}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-2">
        <label className="text-xs font-medium text-zinc-400">
          Categoria
        </label>
        <select
          name="categoria"
          defaultValue={acesso?.categoria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Selecionar</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          URL de login
        </label>
        <input
          name="url_login"
          placeholder="https://..."
          defaultValue={acesso?.url_login ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Usuário</label>
        <input
          name="usuario"
          defaultValue={acesso?.usuario ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">E-mail</label>
        <input
          name="email"
          type="email"
          defaultValue={acesso?.email ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Referência da senha
        </label>
        <input
          name="referencia_senha"
          placeholder="Ex: Bitwarden > Clientes > Empresa X > Hostinger"
          defaultValue={acesso?.referencia_senha ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Observações
        </label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={acesso?.observacoes ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewAcessoForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createAcesso.bind(null, clienteId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar acesso
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <AcessoFields />
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

function AcessoRow({
  clienteId,
  acesso,
}: {
  clienteId: string;
  acesso: Acesso;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateAcesso.bind(null, clienteId, acesso.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <AcessoFields acesso={acesso} />
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

  const contato = [acesso.usuario, acesso.email].filter(Boolean).join(" · ");

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-200">
          {acesso.nome_servico}
          {acesso.categoria && (
            <StatusChip tone="copper">{acesso.categoria}</StatusChip>
          )}
        </p>
        {contato && <p className="text-xs text-zinc-500">{contato}</p>}
        {acesso.referencia_senha && (
          <p className="text-xs italic text-zinc-600">
            senha em: {acesso.referencia_senha}
          </p>
        )}
        {acesso.observacoes && (
          <p className="mt-1 text-xs text-zinc-500">{acesso.observacoes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {acesso.url_login && (
          <a
            href={acesso.url_login}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteAcesso.bind(null, clienteId, acesso.id)}>
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

export function AcessosSection({
  clienteId,
  acessos,
}: {
  clienteId: string;
  acessos: Acesso[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <KeyRound className="h-4 w-4 text-zinc-500" />
          Central de acessos
        </h2>
        <NewAcessoForm clienteId={clienteId} />
      </div>

      {acessos.length > 0 ? (
        <div className="space-y-2">
          {acessos.map((acesso) => (
            <AcessoRow key={acesso.id} clienteId={clienteId} acesso={acesso} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum acesso cadastrado.</p>
      )}
    </div>
  );
}
