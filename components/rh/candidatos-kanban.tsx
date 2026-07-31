"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip, Plus, Trash2, UserCheck } from "lucide-react";
import type { Candidato, CandidatoStatus, Vaga } from "@/lib/types";
import {
  createCandidato,
  updateCandidato,
  moveCandidato,
  deleteCandidato,
  contratarCandidato,
} from "@/app/(dashboard)/rh/recrutamento/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";

const COLUNAS: { status: CandidatoStatus; label: string }[] = [
  { status: "triagem", label: "Triagem" },
  { status: "entrevista", label: "Entrevista" },
  { status: "teste", label: "Teste" },
  { status: "aprovado", label: "Aprovado" },
  { status: "reprovado", label: "Reprovado" },
  { status: "contratado", label: "Contratado" },
];

function Fields({ item, vagaId }: { item?: Candidato; vagaId: string }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <input type="hidden" name="vaga_id" value={vagaId} />
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Nome *</label>
        <input
          name="nome"
          required
          defaultValue={item?.nome}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">E-mail</label>
        <input
          name="email"
          type="email"
          defaultValue={item?.email ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Telefone</label>
        <input
          name="telefone"
          defaultValue={item?.telefone ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Origem</label>
        <input
          name="origem"
          defaultValue={item?.origem ?? ""}
          placeholder="LinkedIn, indicação..."
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      {!item && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-zinc-400">Currículo</label>
          <input
            name="curriculo"
            type="file"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-400 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-xs file:font-medium file:text-zinc-200"
          />
        </div>
      )}
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Observações</label>
        <textarea
          name="observacoes"
          rows={2}
          defaultValue={item?.observacoes ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <input type="hidden" name="status" value={item?.status ?? "triagem"} />
    </div>
  );
}

function NewCandidatoForm({ vagaId }: { vagaId: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(createCandidato, undefined);

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
        Novo candidato
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <Fields vagaId={vagaId} />
      {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
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

function CandidatoCard({
  candidato,
  vagaId,
  curriculoUrl,
}: {
  candidato: Candidato;
  vagaId: string;
  curriculoUrl: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [contratando, setContratando] = useState(false);
  const [contratado, setContratado] = useState(false);
  const updateAction = updateCandidato.bind(null, candidato.id, vagaId);
  const [state, formAction, pending] = useActionState(updateAction, undefined);

  useActionSuccess(state, () => setEditing(false));

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("text/plain", candidato.id);
  }

  async function handleContratar() {
    setContratando(true);
    const result = await contratarCandidato(candidato.id, vagaId);
    setContratando(false);
    if (result && "ok" in result) setContratado(true);
  }

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-2 rounded-lg border border-copper-600/60 bg-zinc-950 p-2.5"
      >
        <Fields item={candidato} vagaId={vagaId} />
        {state && "error" in state && <p className="text-xs text-rose-400">{state.error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-copper-600 px-2 py-1 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => setEditing(true)}
      className="cursor-grab space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 active:cursor-grabbing"
    >
      <p className="text-sm text-zinc-200">{candidato.nome}</p>
      <p className="truncate text-xs text-zinc-500">
        {candidato.email ?? candidato.telefone ?? "sem contato"}
        {candidato.origem && ` · ${candidato.origem}`}
      </p>
      <div className="flex items-center gap-2">
        {curriculoUrl && (
          <a
            href={curriculoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-copper-400 hover:text-copper-300"
          >
            <Paperclip className="h-3 w-3" />
            Currículo
          </a>
        )}
        <form
          action={deleteCandidato.bind(null, candidato.id, vagaId)}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="submit"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </form>
      </div>
      {candidato.status === "contratado" && !contratado && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleContratar();
          }}
          disabled={contratando}
          className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600/90 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          <UserCheck className="h-3.5 w-3.5" />
          {contratando ? "Criando..." : "Criar funcionário"}
        </button>
      )}
      {contratado && (
        <p className="flex items-center gap-1 text-xs text-emerald-400">
          <UserCheck className="h-3.5 w-3.5" />
          Funcionário criado
        </p>
      )}
    </div>
  );
}

export function CandidatosKanban({
  vaga,
  candidatos,
  curriculoUrls,
}: {
  vaga: Vaga;
  candidatos: Candidato[];
  curriculoUrls: Record<string, string | null>;
}) {
  const [dragOverStatus, setDragOverStatus] = useState<CandidatoStatus | null>(null);

  function handleDrop(e: React.DragEvent<HTMLDivElement>, status: CandidatoStatus) {
    e.preventDefault();
    setDragOverStatus(null);
    const candidatoId = e.dataTransfer.getData("text/plain");
    if (!candidatoId) return;
    moveCandidato(candidatoId, vaga.id, status);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/rh/recrutamento"
            className="mb-1 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Todas as vagas
          </Link>
          <h1 className="text-lg font-semibold text-zinc-100">{vaga.titulo}</h1>
          <p className="text-sm text-zinc-500">{candidatos.length} candidato(s)</p>
        </div>
        <NewCandidatoForm vagaId={vaga.id} />
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
        {COLUNAS.map((coluna) => {
          const itens = candidatos.filter((c) => c.status === coluna.status);
          return (
            <div
              key={coluna.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(coluna.status);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, coluna.status)}
              className={`min-h-40 space-y-2 rounded-xl border p-2.5 transition-colors ${
                dragOverStatus === coluna.status
                  ? "border-copper-600/60 bg-copper-950/10"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {coluna.label} <span className="text-zinc-600">({itens.length})</span>
              </p>
              {itens.map((candidato) => (
                <CandidatoCard
                  key={candidato.id}
                  candidato={candidato}
                  vagaId={vaga.id}
                  curriculoUrl={curriculoUrls[candidato.curriculo_path ?? ""] ?? null}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
