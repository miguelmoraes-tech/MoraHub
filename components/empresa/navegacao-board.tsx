"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock } from "lucide-react";
import { useToast } from "@/components/toast";
import { restaurarNavegacao, salvarNavegacao } from "@/app/(dashboard)/configuracoes/navegacao/actions";
import { aplicarPreferenciaMenu, type Preferencia } from "@/lib/modulos/preferencias";
import type { AbaRegistro } from "@/lib/modulos/registry";
import type { ActionState } from "@/lib/actions/types";

export interface ItemEditavel {
  chave: string;
  label: string;
  /** Visão Geral, Módulos e Configurações: nunca ocultáveis. */
  fixo: boolean;
  visivel: boolean;
}

export interface GrupoEditavel {
  titulo: string;
  itens: ItemEditavel[];
}

export interface TelaComAbas {
  chave: string;
  nome: string;
  abas: AbaRegistro[];
}

function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length) return lista;
  const nova = [...lista];
  const [x] = nova.splice(de, 1);
  nova.splice(para, 0, x);
  return nova;
}

/**
 * Personalização da navegação: visibilidade e ordem dos itens (dentro de cada grupo) e abas de
 * cada tela. A pré-visualização usa a MESMA função que a barra lateral (aplicarPreferenciaMenu).
 */
export function NavegacaoBoard({
  grupos: gruposIniciais,
  telas,
  abasOcultas: abasIniciais,
  temPessoal,
  temPadraoEmpresa,
  podeSalvarPadrao,
}: {
  grupos: GrupoEditavel[];
  telas: TelaComAbas[];
  abasOcultas: Record<string, string[]>;
  temPessoal: boolean;
  temPadraoEmpresa: boolean;
  podeSalvarPadrao: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [ocultas, setOcultas] = useState<Record<string, string[]>>(abasIniciais);

  const preferencia: Preferencia = useMemo(() => {
    let ordem = 0;
    const itens = grupos.flatMap((g) => g.itens.map((i) => ({ chave: i.chave, visivel: i.fixo || i.visivel, ordem: ordem++ })));
    return { itens, abasOcultas: ocultas };
  }, [grupos, ocultas]);

  const previa = useMemo(
    () =>
      aplicarPreferenciaMenu(
        grupos.map((g) => ({ titulo: g.titulo, itens: g.itens.map((i) => ({ href: `/${i.chave}`, label: i.label })) })),
        preferencia
      ),
    [grupos, preferencia]
  );

  function alterarGrupo(titulo: string, fn: (itens: ItemEditavel[]) => ItemEditavel[]) {
    setGrupos((atual) => atual.map((g) => (g.titulo === titulo ? { ...g, itens: fn(g.itens) } : g)));
  }

  function alternarAba(tela: TelaComAbas, aba: string) {
    setOcultas((atual) => {
      const lista = atual[tela.chave] ?? [];
      const nova = lista.includes(aba) ? lista.filter((a) => a !== aba) : [...lista, aba];
      if (nova.length >= tela.abas.length) {
        toast.error(`Deixe pelo menos uma aba visível em ${tela.nome}.`);
        return atual;
      }
      return { ...atual, [tela.chave]: nova };
    });
  }

  function executar(fn: () => Promise<ActionState>, sucesso: string) {
    iniciar(async () => {
      const r = await fn();
      if (r && "error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(sucesso);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Personalizar navegação</h1>
        <p className="text-sm text-zinc-500">
          Escolha a ordem e o que aparece no seu menu e nas abas das telas. Vale só para a aparência.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
        <span>
          Ocultar um item <b>não bloqueia a página</b>: quem tem permissão continua abrindo pelo endereço. Nada aqui liga ou
          desliga módulos, muda permissões ou apaga dados. Visão Geral, Módulos e Configurações não podem ser ocultados.
          Módulos ligados depois entram no fim do grupo, visíveis.
          {temPessoal
            ? " Você está usando uma preferência pessoal."
            : temPadraoEmpresa
              ? " Você está usando o padrão da empresa."
              : " Você está usando a ordem original do sistema."}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.titulo} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{g.titulo}</h2>
              <ul className="space-y-1">
                {g.itens.map((i, pos) => (
                  <li key={i.chave} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-900">
                    <span className={`flex-1 text-sm ${i.fixo || i.visivel ? "text-zinc-200" : "text-zinc-600 line-through"}`}>
                      {i.label}
                    </span>
                    <button
                      type="button"
                      aria-label={`Subir ${i.label}`}
                      disabled={pos === 0}
                      onClick={() => alterarGrupo(g.titulo, (itens) => mover(itens, pos, pos - 1))}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descer ${i.label}`}
                      disabled={pos === g.itens.length - 1}
                      onClick={() => alterarGrupo(g.titulo, (itens) => mover(itens, pos, pos + 1))}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    {i.fixo ? (
                      <span className="p-1.5 text-zinc-600" title="Sempre visível">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label={i.visivel ? `Ocultar ${i.label}` : `Mostrar ${i.label}`}
                        aria-pressed={!i.visivel}
                        onClick={() =>
                          alterarGrupo(g.titulo, (itens) => itens.map((x) => (x.chave === i.chave ? { ...x, visivel: !x.visivel } : x)))
                        }
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                      >
                        {i.visivel ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {telas.length > 0 && (
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <h2 className="mb-1 text-sm font-semibold text-zinc-100">Abas das telas</h2>
              <p className="mb-3 text-xs text-zinc-500">
                Desmarque as abas que não usa. Cada tela mantém pelo menos uma; se a aba de abertura estiver oculta, a tela
                abre na primeira visível.
              </p>
              <div className="space-y-3">
                {telas.map((t) => (
                  <div key={t.chave}>
                    <p className="mb-1 text-xs font-medium text-zinc-300">{t.nome}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {t.abas.map((a) => (
                        <label key={a.chave} className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={!(ocultas[t.chave] ?? []).includes(a.chave)}
                            onChange={() => alternarAba(t, a.chave)}
                          />
                          {a.rotulo}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 lg:sticky lg:top-6">
            <p className="mb-3 text-xs font-semibold text-zinc-400">Pré-visualização do menu</p>
            <div className="space-y-4">
              {previa.map((g) => (
                <div key={g.titulo}>
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{g.titulo}</p>
                  <ul className="mt-1 space-y-0.5">
                    {g.itens.map((i) => (
                      <li key={i.href} className="truncate rounded px-1 py-0.5 text-xs text-zinc-300">{i.label}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() => executar(() => salvarNavegacao(preferencia, "pessoal"), "Navegação salva.")}
              className="rounded-lg bg-copper-600 px-3 py-2 text-sm font-medium text-white hover:bg-copper-500 disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar"}
            </button>
            {podeSalvarPadrao && (
              <button
                type="button"
                disabled={pendente}
                onClick={() => executar(() => salvarNavegacao(preferencia, "empresa"), "Padrão da empresa salvo.")}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
              >
                Salvar como padrão da empresa
              </button>
            )}
            {temPessoal && (
              <button
                type="button"
                disabled={pendente}
                onClick={() => {
                  if (!window.confirm("Apagar a sua preferência pessoal e voltar ao padrão?")) return;
                  executar(restaurarNavegacao, "Padrão restaurado.");
                }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
              >
                Restaurar padrão
              </button>
            )}
            {podeSalvarPadrao && (
              <p className="text-[11px] text-zinc-600">
                O padrão da empresa vale para quem não tem preferência pessoal. Ninguém vê a preferência pessoal de outra pessoa.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
