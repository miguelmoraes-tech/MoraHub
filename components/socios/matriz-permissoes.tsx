"use client";

import type { ModuloPermissivel } from "@/lib/socios-shared";
import type { NivelPermissao, PermissaoModulo } from "@/lib/modulos/permissoes";

type Escolha = NivelPermissao | "nenhum";

const OPCOES: { valor: Escolha; rotulo: string }[] = [
  { valor: "nenhum", rotulo: "Nenhum" },
  { valor: "leitura", rotulo: "Leitura" },
  { valor: "edicao", rotulo: "Edição" },
];

/**
 * Matriz módulo × nível (nenhum / leitura / edição) com os extras de tela de
 * cada módulo. Controlada: `valor` é a lista de permissões; módulo sem linha =
 * nenhum. Os extras (ex.: leads/contato) só mudam o que a tela mostra — não
 * são uma barreira de segurança.
 */
export function MatrizPermissoes({
  modulos,
  valor,
  onChange,
  desabilitado = false,
}: {
  modulos: ModuloPermissivel[];
  valor: PermissaoModulo[];
  onChange: (proximo: PermissaoModulo[]) => void;
  desabilitado?: boolean;
}) {
  if (modulos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-500">
        Nenhum módulo da empresa aceita permissão por enquanto (Leads, Renegados, Clientes e Agenda
        precisam estar ligados em Módulos).
      </p>
    );
  }

  function definirNivel(chave: string, escolha: Escolha) {
    const resto = valor.filter((p) => p.modulo !== chave);
    if (escolha === "nenhum") return onChange(resto);
    const atual = valor.find((p) => p.modulo === chave);
    onChange([...resto, { modulo: chave, nivel: escolha, extras: atual?.extras ?? [] }]);
  }

  function alternarExtra(chave: string, extra: string) {
    onChange(
      valor.map((p) =>
        p.modulo !== chave
          ? p
          : {
              ...p,
              extras: p.extras.includes(extra)
                ? p.extras.filter((e) => e !== extra)
                : [...p.extras, extra],
            }
      )
    );
  }

  return (
    <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800">
      {modulos.map((m) => {
        const atual = valor.find((p) => p.modulo === m.chave);
        const escolha: Escolha = atual?.nivel ?? "nenhum";
        return (
          <div key={m.chave} className="space-y-2 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-200">{m.nome}</span>
              <div
                role="radiogroup"
                aria-label={`Acesso a ${m.nome}`}
                className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5"
              >
                {OPCOES.map((o) => (
                  <button
                    key={o.valor}
                    type="button"
                    role="radio"
                    aria-checked={escolha === o.valor}
                    disabled={desabilitado}
                    onClick={() => definirNivel(m.chave, o.valor)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
                      escolha === o.valor
                        ? "bg-copper-600 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {o.rotulo}
                  </button>
                ))}
              </div>
            </div>
            {atual && m.extras.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {m.extras.map((e) => (
                  <label key={e.chave} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={atual.extras.includes(e.chave)}
                      disabled={desabilitado}
                      onChange={() => alternarExtra(m.chave, e.chave)}
                      className="h-3.5 w-3.5 accent-copper-500"
                    />
                    {e.rotulo}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
