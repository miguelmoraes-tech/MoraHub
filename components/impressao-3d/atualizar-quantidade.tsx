"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { BotaoPrimario, BotaoTexto, CLASSE_CAMPO, Campo, ErroForm } from "@/components/impressao-3d/campos";
import { atualizarQuantidade, conferirEstoque } from "@/app/(dashboard)/impressao-3d/estoque/actions";
import {
  MOTIVOS_AJUSTE, MOTIVO_PADRAO, ajustesDaConferencia, diferencaContagem, lerContagem, observacaoConferencia,
  precisaAjustar, saldoParaExibir, textoDiferenca,
} from "@/lib/impressao-3d/ajuste-estoque";
import { UNIDADE_ROTULO, type Material, type MaterialParte } from "@/lib/impressao-3d/tipos";
import { partesAlteradas, resumoConferencia, saldoCurto, textoDisponiveis } from "@/lib/impressao-3d/estoque-uso";
import { useToast } from "@/components/toast";

/** O saldo como texto para o campo (sem separador de milhar: o servidor lê "2500.5" e "2500,5"). */
function saldoComoTexto(saldo: number): string {
  return String(Math.round(saldo * 1000) / 1000);
}

function rotuloUnidade(m: Pick<Material, "unidade">): string {
  return m.unidade === "g" ? "g" : (UNIDADE_ROTULO[m.unidade] ?? m.unidade);
}

/** Aviso ao vivo da diferença (e, no filamento, do saldo em kg). */
function AvisoDiferenca({ saldo, texto, unidade }: { saldo: number; texto: string; unidade: string }) {
  const lida = lerContagem(texto);
  if ("error" in lida) return <p className="text-xs text-rose-400">{lida.error}</p>;
  if (lida.contagem === null) return <p className="text-xs text-zinc-500">Digite quanto tem agora.</p>;
  const dif = diferencaContagem(saldo, lida.contagem);
  if (!precisaAjustar(dif)) return <p className="text-xs text-zinc-500">Igual ao saldo do sistema: nada a ajustar.</p>;
  return (
    <p className={`text-xs font-medium ${dif > 0 ? "text-emerald-400" : "text-rose-400"}`}>
      Diferença: {textoDiferenca(dif, unidade)} ({dif > 0 ? "soma ao" : "tira do"} estoque do sistema).
    </p>
  );
}

/**
 * "Atualizar quantidade" de um item: "Quanto tem agora?" já vem com o saldo atual; ao confirmar, o servidor
 * calcula a diferença e chama p3d_movimentar_estoque (ajuste com sinal). Diferença zero não chama nada.
 */
export function FormAtualizarQuantidade({ material, aoFechar }: { material: Material; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(atualizarQuantidade.bind(null, material.id), undefined);
  useActionSuccess(state, aoFechar);
  const [texto, setTexto] = useState(saldoComoTexto(material.estoque_atual));
  const un = rotuloUnidade(material);
  const lida = lerContagem(texto);
  const dif = "contagem" in lida && lida.contagem !== null ? diferencaContagem(material.estoque_atual, lida.contagem) : 0;
  const saldo = saldoParaExibir(material.estoque_atual, material.unidade);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <p className="text-sm font-medium text-zinc-100">
        Atualizar quantidade · {material.nome}{" "}
        <span className="text-xs font-normal text-zinc-500">
          (no sistema: {saldo.principal}
          {saldo.secundario ? ` · ${saldo.secundario}` : ""})
        </span>
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo rotulo={`Quanto tem agora? (${un})`} ajuda={material.unidade === "g" ? "Em gramas. 1 kg = 1000 g." : undefined}>
          <input
            name="quantidade_nova"
            inputMode="decimal"
            autoComplete="off"
            required
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Quanto tem agora?"
            className={CLASSE_CAMPO}
          />
        </Campo>
        <Campo rotulo="Motivo">
          <select name="motivo" defaultValue={MOTIVO_PADRAO} className={CLASSE_CAMPO} aria-label="Motivo">
            {MOTIVOS_AJUSTE.map((m) => (
              <option key={m.chave} value={m.chave}>{m.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Observação (opcional)">
          <input name="observacao" maxLength={200} className={CLASSE_CAMPO} aria-label="Observação" />
        </Campo>
      </div>
      <AvisoDiferenca saldo={material.estoque_atual} texto={texto} unidade={un} />
      <ErroForm state={state} />
      <div className="flex flex-wrap justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente || !precisaAjustar(dif)}>{pendente ? "Salvando..." : "Confirmar"}</BotaoPrimario>
      </div>
    </form>
  );
}

/**
 * "Conferir estoque": tela cheia, com Confirmar e Cancelar fixos no topo e no rodapé. Cada item mostra
 * "Quanto tem agora?" já preenchido; nos kits, também as cores com "Acabou". Confirmar gera um ajuste só
 * para as linhas alteradas (observação "Conferência de estoque em <data>"), marca as partes que acabaram,
 * mostra "N itens atualizados" e volta à lista. Cancelar (ou Esc) volta sem salvar; com alterações
 * pendentes, pede confirmação para descartar.
 */
export function ConferirEstoque({
  materiais,
  partes,
  aoFechar,
}: {
  materiais: Material[];
  partes: MaterialParte[];
  aoFechar: () => void;
}) {
  const toast = useToast();
  const [state, formAction, pendente] = useActionState(conferirEstoque, undefined);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(materiais.map((m) => [m.id, saldoComoTexto(m.estoque_atual)]))
  );
  const partesDosKits = partes.filter((p) => materiais.some((m) => m.id === p.material_id));
  const [disponiveis, setDisponiveis] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(partesDosKits.map((p) => [p.id, p.disponivel]))
  );
  const resumoRef = useRef("");

  const calculo = ajustesDaConferencia(materiais.map((m) => ({ id: m.id, saldo: m.estoque_atual, contagem: valores[m.id] })));
  const ajustes = "ajustes" in calculo ? calculo.ajustes : [];
  const mudancasPartes = partesAlteradas(partesDosKits, disponiveis);
  const idsPartes = mudancasPartes.map((c) => partesDosKits.find((p) => p.id === c.id)!.material_id);
  const alteracoes = ajustes.length + mudancasPartes.length;
  const pendentes = alteracoes > 0;
  const difPorId = new Map(ajustes.map((a) => [a.id, a.diferenca]));
  const itensPendentes = new Set([...ajustes.map((a) => a.id), ...idsPartes]).size;
  const resumoAtual = resumoConferencia(ajustes.map((a) => a.id), idsPartes);

  useActionSuccess(state, () => {
    toast.success(resumoRef.current || "Nenhuma alteração.");
    aoFechar();
  });

  function cancelar() {
    if (pendentes && !window.confirm("Descartar as alterações da conferência? Nada foi salvo.")) return;
    aoFechar();
  }
  const cancelarRef = useRef(cancelar);
  useEffect(() => {
    cancelarRef.current = cancelar;
  });
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelarRef.current();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const bloqueado = pendente || !pendentes || "error" in calculo;
  const barra = (
    <div className="flex items-center gap-2">
      <span className="mr-auto min-w-0 truncate text-xs text-zinc-400" aria-live="polite">
        {pendentes ? `${itensPendentes} item(ns) para atualizar` : "Nenhuma linha alterada."}
      </span>
      <button
        type="button"
        onClick={cancelar}
        disabled={pendente}
        className="min-h-11 rounded-md border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={bloqueado}
        onClick={() => {
          resumoRef.current = resumoAtual;
        }}
        className="min-h-11 rounded-md bg-copper-600 px-4 text-sm font-semibold text-white hover:bg-copper-500 disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Confirmar"}
      </button>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Conferir estoque" className="fixed inset-0 z-[60] flex flex-col bg-zinc-950">
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 space-y-2 border-b border-zinc-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mx-auto max-w-3xl space-y-2">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Conferir estoque</h2>
              <p className="text-xs text-zinc-500">
                Corrija só o que mudou: tudo já vem preenchido. {observacaoConferencia()}. Esc cancela.
              </p>
            </div>
            {barra}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <ul className="mx-auto max-w-3xl divide-y divide-zinc-800/80 rounded-lg border border-zinc-800/80">
            {materiais.length === 0 && <li className="px-3 py-3 text-xs text-zinc-500">Nenhum item para conferir.</li>}
            {materiais.map((m) => {
              const un = m.kit ? "kit(s)" : rotuloUnidade(m);
              const dif = difPorId.get(m.id);
              const lida = lerContagem(valores[m.id]);
              const partesDoItem = m.kit ? partesDosKits.filter((p) => p.material_id === m.id) : [];
              return (
                <li key={m.id} className="space-y-3 px-3 py-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_12rem] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{m.nome}</p>
                      <p className="text-xs text-zinc-500">
                        No sistema: {saldoCurto(m.estoque_atual, m.unidade).replace(" em estoque", "")}
                        {m.kit ? ` · ${textoDisponiveis(partesDoItem.map((p) => ({ disponivel: disponiveis[p.id] ?? p.disponivel })), m.kit_itens)}` : ""}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-400" htmlFor={`conf-${m.id}`}>
                        {m.kit ? "Quantos kits tem agora?" : `Quanto tem agora? (${un})`}
                      </label>
                      <input
                        id={`conf-${m.id}`}
                        name={`q:${m.id}`}
                        inputMode="decimal"
                        autoComplete="off"
                        value={valores[m.id] ?? ""}
                        onChange={(e) => setValores((v) => ({ ...v, [m.id]: e.target.value }))}
                        className={CLASSE_CAMPO}
                      />
                      {"error" in lida ? (
                        <p className="text-[11px] text-rose-400">{lida.error}</p>
                      ) : dif !== undefined ? (
                        <p className={`text-[11px] font-medium ${dif > 0 ? "text-emerald-400" : "text-rose-400"}`}>{textoDiferenca(dif, un)}</p>
                      ) : null}
                    </div>
                  </div>
                  {partesDoItem.length > 0 && (
                    <fieldset className="space-y-1 rounded-md bg-zinc-900/40 p-2">
                      <legend className="px-1 text-[11px] font-medium text-zinc-400">Cores que acabaram</legend>
                      {partesDoItem.map((p) => {
                        const tem = disponiveis[p.id] ?? p.disponivel;
                        return (
                          <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 text-sm text-zinc-300 hover:bg-zinc-800/60">
                            <input
                              type="checkbox"
                              checked={!tem}
                              onChange={(e) => setDisponiveis((d) => ({ ...d, [p.id]: !e.target.checked }))}
                              className="h-5 w-5 shrink-0"
                            />
                            <span className="h-4 w-4 shrink-0 rounded-full border border-zinc-700" style={p.cor_hex ? { backgroundColor: p.cor_hex } : undefined} aria-hidden="true" />
                            <span className={`min-w-0 flex-1 truncate ${tem ? "" : "text-zinc-500 line-through"}`}>{p.nome}</span>
                            <span className="text-xs text-zinc-500">{tem ? "" : "acabou"}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                  )}
                </li>
              );
            })}
          </ul>
          {mudancasPartes.map((c) => (
            <input key={c.id} type="hidden" name={`parte:${c.id}`} value={c.disponivel ? "1" : "0"} />
          ))}
          <div className="mx-auto mt-3 max-w-3xl space-y-1">
            <ErroForm state={state} />
            {"error" in calculo && <p className="text-xs text-rose-400">{calculo.error}</p>}
          </div>
        </div>

        <footer className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-3xl">{barra}</div>
        </footer>
      </form>
    </div>
  );
}
