"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  GitBranch,
  FileText,
  Receipt,
} from "lucide-react";
import type { Projeto, ProjetoStatus } from "@/lib/types";
import {
  createProjeto,
  updateProjeto,
  deleteProjeto,
} from "@/app/(dashboard)/clientes/[id]/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { formatCurrency } from "@/lib/format";

const STATUS_LABEL: Record<ProjetoStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  pausado: "Pausado",
};

const STATUS_TONE: Record<ProjetoStatus, ChipTone> = {
  planejado: "zinc",
  em_andamento: "sky",
  concluido: "emerald",
  pausado: "amber",
};

function ProjetoFields({ projeto }: { projeto?: Projeto }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="nome"
          required
          defaultValue={projeto?.nome}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <input
          name="tipo"
          placeholder="Site, E-commerce, Automação..."
          defaultValue={projeto?.tipo ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Status</label>
        <select
          name="status"
          defaultValue={projeto?.status ?? "planejado"}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="planejado">Planejado</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluido">Concluído</option>
          <option value="pausado">Pausado</option>
        </select>
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">Escopo</label>
        <textarea
          name="escopo"
          rows={2}
          defaultValue={projeto?.escopo ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Tecnologias
        </label>
        <input
          name="tecnologias"
          defaultValue={projeto?.tecnologias ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Outros links
        </label>
        <input
          name="links"
          defaultValue={projeto?.links ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Repositório Git
        </label>
        <input
          name="repositorio_git"
          placeholder="https://github.com/..."
          defaultValue={projeto?.repositorio_git ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          URL de deploy
        </label>
        <input
          name="deploy_url"
          placeholder="https://..."
          defaultValue={projeto?.deploy_url ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">
          Link da documentação
        </label>
        <input
          name="documentacao_link"
          placeholder="https://..."
          defaultValue={projeto?.documentacao_link ?? ""}
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
          defaultValue={projeto?.observacoes ?? ""}
          className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
    </div>
  );
}

function NewProjetoForm({ clienteId }: { clienteId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const action = createProjeto.bind(null, clienteId);
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
        Adicionar projeto
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <ProjetoFields />
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

function ProjetoRow({
  clienteId,
  projeto,
  custoTotal,
}: {
  clienteId: string;
  projeto: Projeto;
  custoTotal: number;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateProjeto.bind(null, clienteId, projeto.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <ProjetoFields projeto={projeto} />
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

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm text-zinc-200">
          {projeto.nome}
          <StatusChip tone={STATUS_TONE[projeto.status]}>
            {STATUS_LABEL[projeto.status]}
          </StatusChip>
        </p>
        {(projeto.tipo || projeto.tecnologias) && (
          <p className="text-xs text-zinc-500">
            {[projeto.tipo, projeto.tecnologias].filter(Boolean).join(" · ")}
          </p>
        )}
        {projeto.escopo && (
          <p className="mt-1 text-xs text-zinc-500">{projeto.escopo}</p>
        )}
        {custoTotal > 0 && (
          <p className="mt-1 flex items-center gap-1 text-xs text-rose-400">
            <Receipt className="h-3 w-3" />
            Custo do projeto: {formatCurrency(custoTotal)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {projeto.repositorio_git && (
          <a
            href={projeto.repositorio_git}
            target="_blank"
            rel="noopener noreferrer"
            title="Repositório"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </a>
        )}
        {projeto.deploy_url && (
          <a
            href={projeto.deploy_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Deploy"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {projeto.documentacao_link && (
          <a
            href={projeto.documentacao_link}
            target="_blank"
            rel="noopener noreferrer"
            title="Documentação"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <FileText className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <form action={deleteProjeto.bind(null, clienteId, projeto.id)}>
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

export function ProjetosSection({
  clienteId,
  projetos,
  custosPorProjeto = {},
}: {
  clienteId: string;
  projetos: Projeto[];
  custosPorProjeto?: Record<string, number>;
}) {
  return (
    <div id="projetos" className="scroll-mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FolderKanban className="h-4 w-4 text-zinc-500" />
          Projetos
        </h2>
        <NewProjetoForm clienteId={clienteId} />
      </div>

      {projetos.length > 0 ? (
        <div className="space-y-2">
          {projetos.map((projeto) => (
            <ProjetoRow
              key={projeto.id}
              clienteId={clienteId}
              projeto={projeto}
              custoTotal={custosPorProjeto[projeto.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-600">Nenhum projeto cadastrado.</p>
      )}
    </div>
  );
}
