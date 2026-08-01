"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Database, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import type { Backup, Projeto } from "@/lib/types";
import {
  createBackup,
  updateBackup,
  deleteBackup,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

function BackupFields({
  backup,
  projetos,
}: {
  backup?: Backup;
  projetos: Projeto[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data *</label>
        <input
          name="data"
          type="date"
          required
          defaultValue={backup?.data}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <input
          name="tipo"
          placeholder="Ex: Banco de dados"
          defaultValue={backup?.tipo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Local</label>
        <input
          name="local"
          placeholder="Ex: AWS S3, HD externo"
          defaultValue={backup?.local ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Projeto</label>
        <select
          name="projeto_id"
          defaultValue={backup?.projeto_id ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhum</option>
          {projetos.map((projeto) => (
            <option key={projeto.id} value={projeto.id}>
              {projeto.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Link ou arquivo
        </label>
        <input
          name="link_ou_arquivo"
          placeholder="URL do backup ou referência ao arquivo"
          defaultValue={backup?.link_ou_arquivo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewBackupForm({
  clienteId,
  projetos,
}: {
  clienteId: string;
  projetos: Projeto[];
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createBackup.bind(null, clienteId);
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
        Adicionar backup
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <BackupFields projetos={projetos} />
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

function BackupRow({
  clienteId,
  backup,
  projetos,
}: {
  clienteId: string;
  backup: Backup;
  projetos: Projeto[];
}) {
  const [editing, setEditing] = useState(false);
  const action = updateBackup.bind(null, clienteId, backup.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <BackupFields backup={backup} projetos={projetos} />
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

  const projeto = projetos.find((p) => p.id === backup.projeto_id);

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-zinc-200">
          {backup.tipo || "Backup"}
        </p>
        <p className="text-xs text-zinc-500">
          {formatDate(backup.data)}
          {backup.local && ` · ${backup.local}`}
          {projeto && ` · ${projeto.nome}`}
        </p>
        {backup.link_ou_arquivo && (
          <a
            href={backup.link_ou_arquivo}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-xs text-copper-400 hover:text-copper-300"
          >
            {backup.link_ou_arquivo}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteBackup.bind(null, clienteId, backup.id)}>
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

export function BackupsSection({
  clienteId,
  backups,
  projetos,
}: {
  clienteId: string;
  backups: Backup[];
  projetos: Projeto[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Database className="h-4 w-4 text-zinc-500" />
          Backups
        </h2>
        <NewBackupForm clienteId={clienteId} projetos={projetos} />
      </div>

      {backups.length > 0 ? (
        <div className="space-y-2">
          {backups.map((backup) => (
            <BackupRow
              key={backup.id}
              clienteId={clienteId}
              backup={backup}
              projetos={projetos}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum backup registrado.</p>
      )}
    </div>
  );
}
