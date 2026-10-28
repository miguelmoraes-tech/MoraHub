"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { criarEmpresa } from "@/lib/actions/empresa";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { EMPRESA_NOME_MAX, EMPRESA_NOME_MIN } from "@/lib/empresa";
import { iconeDoNicho } from "@/components/nichos/icones";
import { resumoModulos, type NichoCatalogo } from "@/lib/nichos-shared";

export function NovaEmpresaForm({ nichos = [] }: { nichos?: NichoCatalogo[] }) {
  const [state, formAction, pending] = useActionState(criarEmpresa, undefined);
  useActionToast(state);
  const [nichoChave, setNichoChave] = useState("");
  const [modeloChave, setModeloChave] = useState("");

  const nicho = nichos.find((n) => n.chave === nichoChave) ?? null;

  function escolherNicho(chave: string) {
    // Clicar no nicho já escolhido desfaz a escolha (é um passo opcional).
    setNichoChave((atual) => (atual === chave ? "" : chave));
    setModeloChave("");
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="nome" className="text-xs font-medium text-zinc-400">
          Nome da empresa
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          minLength={EMPRESA_NOME_MIN}
          maxLength={EMPRESA_NOME_MAX}
          autoFocus
          autoComplete="organization"
          placeholder="Ex.: Studio Aurora"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      {nichos.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-zinc-400">
            Qual é o seu tipo de negócio? <span className="text-zinc-600">(opcional)</span>
          </legend>
          <input type="hidden" name="nicho" value={nichoChave} />
          <input type="hidden" name="modelo" value={modeloChave} />

          <div className="space-y-2">
            {nichos.map((n) => {
              const Icone = iconeDoNicho(n.icone);
              const escolhido = n.chave === nichoChave;
              return (
                <button
                  key={n.chave}
                  type="button"
                  aria-pressed={escolhido}
                  onClick={() => escolherNicho(n.chave)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    escolhido
                      ? "border-copper-600/60 bg-copper-600/10"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      escolhido ? "bg-copper-400 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icone className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-100">{n.nome}</span>
                    {n.descricao && (
                      <span className="block text-xs leading-relaxed text-zinc-500">
                        {n.descricao}
                      </span>
                    )}
                  </span>
                  {escolhido && <Check className="mt-1 h-4 w-4 shrink-0 text-copper-400" />}
                </button>
              );
            })}
          </div>

          {nicho && nicho.modelos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-zinc-400">
                Algum modelo parecido com o seu? <span className="text-zinc-600">(opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {nicho.modelos.map((m) => {
                  const escolhido = m.chave === modeloChave;
                  return (
                    <button
                      key={m.chave}
                      type="button"
                      aria-pressed={escolhido}
                      title={m.descricao ?? undefined}
                      onClick={() => setModeloChave(escolhido ? "" : m.chave)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        escolhido
                          ? "border-copper-600/60 bg-copper-600/15 text-copper-300"
                          : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {m.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {nicho && nicho.modulos.length > 0 && (
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs leading-relaxed text-zinc-400">
              Vamos ligar:{" "}
              <strong className="font-medium text-zinc-200">
                {resumoModulos(nicho.modulos.map((m) => m.nome))}
              </strong>
              . Dá para mudar tudo depois.
            </p>
          )}

          {nicho ? (
            <button
              type="button"
              onClick={() => escolherNicho(nichoChave)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
            >
              Pular, personalizo depois
            </button>
          ) : (
            <p className="text-xs text-zinc-600">
              Pode pular: sem escolher, você personaliza depois em Módulos e Configurações.
            </p>
          )}
        </fieldset>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-copper-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Criando..." : "Criar empresa"}
      </button>
    </form>
  );
}
