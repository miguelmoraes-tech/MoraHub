"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { BotaoPrimario, BotaoTexto, CLASSE_CAMPO, Campo, ErroForm, Vazio, useAcao } from "@/components/impressao-3d/campos";
import { alternarParteDisponivel, excluirParte, marcarKitZerado, salvarParte } from "@/app/(dashboard)/impressao-3d/estoque/actions";
import { textoAcabouEm, textoDisponiveis, todasAcabaram } from "@/lib/impressao-3d/estoque-uso";
import type { Material, MaterialParte } from "@/lib/impressao-3d/tipos";

/** Cor (seletor + nome) e observação de uma parte; serve para adicionar e para editar. */
function FormParte({
  material, parte, aoFechar,
}: { material: Material; parte?: MaterialParte; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(salvarParte.bind(null, material.id, parte?.id ?? null), undefined);
  useActionSuccess(state, aoFechar);
  const [cor, setCor] = useState(parte?.cor_hex ?? "");
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo rotulo="Nome da cor *">
          <input name="nome" required maxLength={80} defaultValue={parte?.nome ?? ""} aria-label="Nome da cor" className={CLASSE_CAMPO} />
        </Campo>
        <Campo rotulo="Cor">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Escolher cor"
              value={/^#[0-9A-Fa-f]{6}$/.test(cor) ? cor : "#808080"}
              onChange={(e) => setCor(e.target.value)}
              className="h-11 w-14 shrink-0 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
            />
            <input name="cor_hex" value={cor} onChange={(e) => setCor(e.target.value)} maxLength={7} placeholder="#RRGGBB" aria-label="Código da cor" className={CLASSE_CAMPO} />
          </div>
        </Campo>
        <Campo rotulo="Observação">
          <input name="observacao" maxLength={300} defaultValue={parte?.observacao ?? ""} aria-label="Observação" className={CLASSE_CAMPO} />
        </Campo>
      </div>
      <ErroForm state={state} />
      <div className="flex flex-wrap justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function LinhaParte({ material, parte, podeEditar }: { material: Material; parte: MaterialParte; podeEditar: boolean }) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const { executar, pendente } = useAcao();

  if (editando) return <FormParte material={material} parte={parte} aoFechar={() => setEditando(false)} />;
  const acabou = textoAcabouEm(parte);
  return (
    <li className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="h-6 w-6 shrink-0 rounded-full border border-zinc-700"
          style={parte.cor_hex ? { backgroundColor: parte.cor_hex } : undefined}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${parte.disponivel ? "text-zinc-200" : "text-zinc-500 line-through"}`}>{parte.nome}</p>
          {(acabou || parte.observacao) && (
            <p className="text-xs text-zinc-500">{[acabou, parte.observacao].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        {podeEditar && !confirmando && (
          <div className="flex flex-wrap items-center gap-1.5">
            {parte.disponivel ? (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="min-h-11 rounded-md border border-zinc-700 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800 sm:min-h-0 sm:py-1.5"
              >
                Acabou
              </button>
            ) : (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => alternarParteDisponivel(parte.id, true), { sucesso: `"${parte.nome}" voltou a ter.` })}
                className="min-h-11 rounded-md border border-copper-500/40 px-3 text-xs font-medium text-copper-300 hover:bg-copper-600/10 disabled:opacity-60 sm:min-h-0 sm:py-1.5"
              >
                Desfazer
              </button>
            )}
            <BotaoTexto onClick={() => setEditando(true)}>Editar</BotaoTexto>
            <button
              type="button"
              disabled={pendente}
              aria-label={`Excluir ${parte.nome}`}
              onClick={() => executar(() => excluirParte(parte.id), { confirmar: `Excluir a cor "${parte.nome}"?`, sucesso: "Cor excluída." })}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {confirmando && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-zinc-900/70 px-3 py-2 text-xs text-zinc-300">
          <span className="mr-auto">Marcar &quot;{parte.nome}&quot; como acabou?</span>
          <BotaoTexto onClick={() => setConfirmando(false)}>Não</BotaoTexto>
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => alternarParteDisponivel(parte.id, false), { sucesso: `"${parte.nome}" marcada como acabou. Dá para desfazer.`, aoConcluir: () => setConfirmando(false) })}
            className="min-h-11 rounded-md bg-copper-600 px-3 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60 sm:min-h-0 sm:py-1.5"
          >
            Sim, acabou
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Detalhe de um kit: as partes (cores) com o interruptor "Acabou" (confirmação leve e "Desfazer"), a data em
 * que acabou e a observação; "Adicionar cor". Quando todas acabam, SUGERE "Marcar kit como zerado" (ajuste de
 * -1 com motivo "Kit acabou"): nunca faz sozinho.
 */
export function PartesDoKit({ material, partes, podeEditar }: { material: Material; partes: MaterialParte[]; podeEditar: boolean }) {
  const [novo, setNovo] = useState(false);
  const { executar, pendente } = useAcao();
  const zerar = todasAcabaram(partes) && material.estoque_atual >= 1;

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-100">
          Cores do kit <span className="text-xs font-normal text-zinc-500">· {textoDisponiveis(partes, material.kit_itens)}</span>
        </p>
        {podeEditar && !novo && (
          <button
            type="button"
            onClick={() => setNovo(true)}
            className="flex min-h-11 items-center gap-1.5 rounded-md border border-zinc-700 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-800 sm:min-h-0 sm:py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar cor
          </button>
        )}
      </div>
      {zerar && podeEditar && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          <span className="mr-auto">Todas as cores acabaram. Quer dar baixa do kit no estoque?</span>
          <button
            type="button"
            disabled={pendente}
            onClick={() => executar(() => marcarKitZerado(material.id), { confirmar: `Marcar "${material.nome}" como zerado? Tira 1 kit do estoque.`, sucesso: "Kit marcado como zerado." })}
            className="min-h-11 rounded-md bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-60 sm:min-h-0 sm:py-1.5"
          >
            Marcar kit como zerado
          </button>
        </div>
      )}
      {novo && <FormParte material={material} aoFechar={() => setNovo(false)} />}
      {partes.length === 0 && !novo ? (
        <Vazio>Nenhuma cor cadastrada neste kit.</Vazio>
      ) : (
        <ul className="space-y-2">
          {partes.map((p) => (
            <LinhaParte key={p.id} material={material} parte={p} podeEditar={podeEditar} />
          ))}
        </ul>
      )}
    </div>
  );
}
