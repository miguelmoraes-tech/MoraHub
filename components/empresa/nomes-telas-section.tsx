"use client";

import { useState, useTransition } from "react";
import { restaurarPadraoDoNicho, salvarNomesDasTelas } from "@/lib/actions/nichos";
import { useToast } from "@/components/toast";
import {
  ROTULO_MAX,
  ROTULOS_PADRAO,
  validarRotulo,
  type MapaRotulos,
  type RotuloModulo,
} from "@/lib/rotulos-shared";

/** Módulo ligado da empresa, com o nome que o catálogo dá a ele. */
export interface ModuloEditavel {
  chave: string;
  nome: string;
}

/**
 * Configurações → "Nomes das telas": singular e plural de cada módulo ligado.
 * Salva só o que mudou; o servidor mescla com o gravado e manda o mapa completo.
 * Quem renderiza usa `key` com os nomes gravados: ao revalidar, o formulário recomeça deles.
 */
export function NomesTelasSection({
  modulos,
  atual,
  temNicho,
}: {
  modulos: ModuloEditavel[];
  /** Rótulos gravados hoje na empresa (chave do módulo → singular/plural). */
  atual: MapaRotulos;
  temNicho: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const valorInicial = (chave: string): RotuloModulo =>
    atual[chave] ?? ROTULOS_PADRAO[chave] ?? { singular: chave, plural: chave };
  const [valores, setValores] = useState<Record<string, RotuloModulo>>(() =>
    Object.fromEntries(modulos.map((m) => [m.chave, valorInicial(m.chave)]))
  );
  const [confirmandoRestaurar, setConfirmandoRestaurar] = useState(false);

  function mudou(chave: string) {
    const v = valores[chave];
    const i = valorInicial(chave);
    return v.singular !== i.singular || v.plural !== i.plural;
  }
  const alterados = modulos.filter((m) => mudou(m.chave));

  function editar(chave: string, forma: keyof RotuloModulo, texto: string) {
    setValores((v) => ({ ...v, [chave]: { ...v[chave], [forma]: texto } }));
  }

  function salvar() {
    for (const m of alterados) {
      const erro = validarRotulo(valores[m.chave]);
      if (erro) {
        toast.error(`${m.nome}: ${erro}`);
        return;
      }
    }
    startTransition(async () => {
      const resultado = await salvarNomesDasTelas(
        Object.fromEntries(alterados.map((m) => [m.chave, valores[m.chave]]))
      );
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      toast.success("Nomes das telas atualizados.");
    });
  }

  function restaurar() {
    startTransition(async () => {
      const resultado = await restaurarPadraoDoNicho();
      setConfirmandoRestaurar(false);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      toast.success(temNicho ? "Nomes restaurados para o padrão do nicho." : "Nomes restaurados.");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Nomes das telas</h2>
        <p className="text-sm text-zinc-500">
          Como cada módulo se chama no menu e nas telas (ex.: Clientes → Pacientes). Só muda o
          nome: os dados continuam os mesmos.
        </p>
      </div>

      {modulos.length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhum módulo ligado.</p>
      ) : (
        <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800">
          {modulos.map((m) => {
            const padrao = ROTULOS_PADRAO[m.chave];
            return (
              <div key={m.chave} className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
                <span className="text-sm font-medium text-zinc-200">{m.nome}</span>
                {(["singular", "plural"] as const).map((forma) => (
                  <label key={forma} className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-zinc-600">
                      {forma === "singular" ? "Singular" : "Plural"}
                    </span>
                    <input
                      type="text"
                      value={valores[m.chave][forma]}
                      maxLength={ROTULO_MAX}
                      placeholder={padrao?.[forma]}
                      disabled={pending}
                      onChange={(e) => editar(m.chave, forma, e.target.value)}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                    />
                  </label>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending || alterados.length === 0}
          onClick={salvar}
          className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar nomes"}
        </button>

        {confirmandoRestaurar ? (
          <>
            <span className="text-xs text-zinc-400">
              {temNicho
                ? "Troca todos os nomes pelos do nicho e modelo."
                : "Volta todos os nomes para o padrão do app."}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={restaurar}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-zinc-600"
            >
              Confirmar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmandoRestaurar(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmandoRestaurar(true)}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
          >
            Restaurar padrão do nicho
          </button>
        )}
      </div>
    </section>
  );
}
