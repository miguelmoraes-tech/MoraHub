"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  atualizarPermissoesMembro,
  cancelarConvite,
  removerMembro,
} from "@/app/(dashboard)/socios/actions";
import { useToast } from "@/components/toast";
import { StatusChip } from "@/components/status-chip";
import { MatrizPermissoes } from "@/components/socios/matriz-permissoes";
import { ConvidarMembro } from "@/components/socios/convidar-membro";
import { formatDate } from "@/lib/format";
import {
  resumoPermissoes,
  rotuloDoPapel,
  type ConviteEquipe,
  type MembroEquipe,
  type ModuloPermissivel,
} from "@/lib/socios-shared";
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

function nomesDosModulos(modulos: ModuloPermissivel[]): Record<string, string> {
  return Object.fromEntries(modulos.map((m) => [m.chave, m.nome]));
}

export function EquipeSection({
  modulos,
  membros,
  convites,
  ehFundador,
  userId,
}: {
  modulos: ModuloPermissivel[];
  membros: MembroEquipe[];
  convites: ConviteEquipe[];
  ehFundador: boolean;
  userId: string;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState<PermissaoModulo[]>([]);
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const nomes = nomesDosModulos(modulos);

  function editar(m: MembroEquipe) {
    setEditandoId(m.membroId);
    setRascunho(m.permissoes);
  }

  function salvar(m: MembroEquipe) {
    startTransition(async () => {
      const r = await atualizarPermissoesMembro(m.membroId, rascunho);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      setEditandoId(null);
      toast.success("Permissões atualizadas.");
    });
  }

  function remover(m: MembroEquipe) {
    startTransition(async () => {
      const r = await removerMembro(m.membroId);
      setRemovendoId(null);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Acesso removido.");
    });
  }

  function cancelar(c: ConviteEquipe) {
    startTransition(async () => {
      const r = await cancelarConvite(c.id);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Convite cancelado.");
    });
  }

  return (
    <div className="space-y-6">
      <ConvidarMembro modulos={modulos} ehFundador={ehFundador} />

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Equipe ({membros.length})
        </h2>
        {membros.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            Ninguém na equipe ainda. Convide alguém ou crie um setor com código.
          </p>
        ) : (
          membros.map((m) => {
            const restrito = m.papel === "socio" || m.papel === "funcionario";
            // Remover cofundador é só do fundador; o vendedor se gerencia em /vendedores.
            const podeRemover =
              m.membroId !== userId &&
              (restrito || (m.papel === "cofundador" && ehFundador));
            const editando = editandoId === m.membroId;
            return (
              <div
                key={m.membroId}
                className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-100">
                      {m.nome || m.email || "Sem nome"}
                    </p>
                    {m.nome && m.email && (
                      <p className="truncate text-xs text-zinc-500">{m.email}</p>
                    )}
                  </div>
                  <StatusChip tone={m.papel === "cofundador" ? "copper" : "sky"}>
                    {rotuloDoPapel(m.papel)}
                  </StatusChip>
                </div>

                {m.papel === "cofundador" ? (
                  <p className="text-xs text-zinc-500">Mesmo nível do fundador.</p>
                ) : restrito ? (
                  <p className="text-xs text-zinc-500">{resumoPermissoes(m.permissoes, nomes)}</p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Acesso gerenciado em Vendedores.
                  </p>
                )}

                {editando && (
                  <div className="space-y-3">
                    <MatrizPermissoes
                      modulos={modulos}
                      valor={rascunho}
                      onChange={setRascunho}
                      desabilitado={pending}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => salvar(m)}
                        disabled={pending}
                        className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
                      >
                        {pending ? "Salvando..." : "Salvar"}
                      </button>
                    </div>
                  </div>
                )}

                {!editando && (restrito || podeRemover) && (
                  <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    {removendoId === m.membroId ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-400">Remover o acesso?</span>
                        <button
                          type="button"
                          onClick={() => remover(m)}
                          disabled={pending}
                          className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemovendoId(null)}
                          className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        {restrito ? (
                          <button
                            type="button"
                            onClick={() => editar(m)}
                            className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar permissões
                          </button>
                        ) : (
                          <span />
                        )}
                        {podeRemover && (
                          <button
                            type="button"
                            onClick={() => setRemovendoId(m.membroId)}
                            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Convites pendentes ({convites.length})
        </h2>
        {convites.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhum convite pendente.</p>
        ) : (
          convites.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">{c.email}</p>
                <p className="text-xs text-zinc-500">
                  {rotuloDoPapel(c.papel)}
                  {c.papel === "cofundador" ? "" : ` · ${resumoPermissoes(c.permissoes, nomes)}`}
                  {c.expiraEm && ` · expira em ${formatDate(c.expiraEm.slice(0, 10))}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => cancelar(c)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
