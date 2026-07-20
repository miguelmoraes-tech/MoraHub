"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2, Globe, AtSign, ExternalLink } from "lucide-react";
import type { Renegado } from "@/lib/types";
import {
  updateRenegado,
  deleteRenegado,
} from "@/app/(dashboard)/renegados/actions";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { RenegadoFields } from "@/components/renegado-fields";
import { StatusChip } from "@/components/status-chip";
import { formatDate } from "@/lib/format";

export function RenegadoCard({ renegado }: { renegado: Renegado }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateAction = updateRenegado.bind(null, renegado.id);
  const [state, formAction, pending] = useActionState(updateAction, undefined);
  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
      >
        <RenegadoFields renegado={renegado} />
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
            className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {renegado.nome}
        </h3>
        {renegado.contato && (
          <p className="truncate text-xs text-zinc-500">{renegado.contato}</p>
        )}
      </div>

      {renegado.descricao && (
        <p className="line-clamp-2 text-xs leading-relaxed text-zinc-500">
          {renegado.descricao}
        </p>
      )}

      {renegado.nicho && <StatusChip tone="indigo">{renegado.nicho}</StatusChip>}

      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        {renegado.tem_site && (
          <span className="flex items-center gap-1">
            <Globe className="h-3.5 w-3.5" />
            {renegado.site_link ? (
              <a
                href={renegado.site_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:text-zinc-300"
              >
                Site <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "Site"
            )}
          </span>
        )}
        {renegado.tem_insta && (
          <span className="flex items-center gap-1">
            <AtSign className="h-3.5 w-3.5" />
            {renegado.insta_link ? (
              <a
                href={renegado.insta_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 hover:text-zinc-300"
              >
                Instagram <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              "Instagram"
            )}
          </span>
        )}
      </div>

      {renegado.motivo_negou && (
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500">
          {renegado.motivo_negou}
        </div>
      )}

      <p className="text-xs text-zinc-600">
        abordado por {renegado.abordado_por}
        {renegado.data_abordagem && ` · ${formatDate(renegado.data_abordagem)}`}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-zinc-800/80 pt-3">
        {confirmingDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">Excluir?</span>
            <form action={deleteRenegado.bind(null, renegado.id)}>
              <button
                type="submit"
                className="rounded-md bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-500"
              >
                Confirmar
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded-md px-2 py-1 font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
