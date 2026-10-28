"use client";

import { useState, useTransition } from "react";
import { aplicarNichoDaEmpresa } from "@/lib/actions/nichos";
import { useToast } from "@/components/toast";
import { iconeDoNicho } from "@/components/nichos/icones";
import { resumoModulos, type NichoCatalogo } from "@/lib/nichos-shared";

/** Configurações → "Nicho e modelo": mostra o atual e deixa trocar (com confirmação). */
export function NichoModeloSection({
  nichos,
  nichoAtual,
  modeloAtual,
}: {
  nichos: NichoCatalogo[];
  nichoAtual: string | null;
  modeloAtual: string | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [trocando, setTrocando] = useState(false);
  const [nichoChave, setNichoChave] = useState(nichoAtual ?? "");
  const [modeloChave, setModeloChave] = useState(modeloAtual ?? "");
  const [confirmando, setConfirmando] = useState(false);

  const atual = nichos.find((n) => n.chave === nichoAtual) ?? null;
  const modeloNome = atual?.modelos.find((m) => m.chave === modeloAtual)?.nome ?? null;
  const escolhido = nichos.find((n) => n.chave === nichoChave) ?? null;

  function cancelar() {
    setTrocando(false);
    setConfirmando(false);
    setNichoChave(nichoAtual ?? "");
    setModeloChave(modeloAtual ?? "");
  }

  function aplicar() {
    startTransition(async () => {
      const resultado = await aplicarNichoDaEmpresa(nichoChave, modeloChave || null);
      if ("error" in resultado) {
        toast.error(resultado.error);
        return;
      }
      toast.success("Tipo de negócio atualizado.");
      setTrocando(false);
      setConfirmando(false);
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Nicho e modelo</h2>
        <p className="text-sm text-zinc-500">
          {atual
            ? `${atual.nome}${modeloNome ? ` · ${modeloNome}` : ""}`
            : "Nenhum tipo de negócio definido. A empresa usa os nomes padrão do app."}
        </p>
      </div>

      {nichos.length === 0 ? null : !trocando ? (
        <button
          type="button"
          onClick={() => setTrocando(true)}
          className="rounded-lg border border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          {atual ? "Trocar nicho ou modelo" : "Escolher tipo de negócio"}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {nichos.map((n) => {
              const Icone = iconeDoNicho(n.icone);
              const ativo = n.chave === nichoChave;
              return (
                <button
                  key={n.chave}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    setNichoChave(n.chave);
                    setModeloChave("");
                    setConfirmando(false);
                  }}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                    ativo
                      ? "border-copper-600/60 bg-copper-600/10"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      ativo ? "bg-copper-400 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Icone className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-100">{n.nome}</span>
                    {n.descricao && (
                      <span className="block text-xs leading-relaxed text-zinc-500">
                        {n.descricao}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {escolhido && escolhido.modelos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-zinc-400">
                Modelo <span className="text-zinc-600">(opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {escolhido.modelos.map((m) => {
                  const ativo = m.chave === modeloChave;
                  return (
                    <button
                      key={m.chave}
                      type="button"
                      aria-pressed={ativo}
                      title={m.descricao ?? undefined}
                      onClick={() => {
                        setModeloChave(ativo ? "" : m.chave);
                        setConfirmando(false);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        ativo
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

          {escolhido && escolhido.modulos.length > 0 && (
            <p className="text-xs text-zinc-500">
              Módulos recomendados:{" "}
              <span className="text-zinc-300">
                {resumoModulos(escolhido.modulos.map((m) => m.nome))}
              </span>
            </p>
          )}

          {confirmando && (
            <p className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs leading-relaxed text-zinc-400">
              Liga os módulos recomendados e troca os nomes das telas. Não desliga nada nem apaga
              dados.
            </p>
          )}

          <div className="flex items-center gap-2">
            {confirmando ? (
              <button
                type="button"
                disabled={pending || !nichoChave}
                onClick={aplicar}
                className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
              >
                {pending ? "Aplicando..." : "Confirmar e aplicar"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!nichoChave}
                onClick={() => setConfirmando(true)}
                className="rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500 disabled:opacity-60"
              >
                Aplicar
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={cancelar}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
