"use client";

import { useActionState, useState } from "react";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { BotaoPrimario, BotaoTexto, CLASSE_CAMPO, Campo, ErroForm } from "@/components/impressao-3d/campos";
import { atualizarQuantidade, conferirEstoque } from "@/app/(dashboard)/impressao-3d/estoque/actions";
import {
  MOTIVOS_AJUSTE, MOTIVO_PADRAO, ajustesDaConferencia, diferencaContagem, lerContagem, observacaoConferencia,
  precisaAjustar, saldoParaExibir, textoDiferenca,
} from "@/lib/impressao-3d/ajuste-estoque";
import { UNIDADE_ROTULO, type Material } from "@/lib/impressao-3d/tipos";
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
 * "Conferir estoque": todos os itens do filtro atual com "Quanto tem agora?" por linha (já com o saldo).
 * Ao salvar, gera um ajuste só para as linhas que mudaram, com a observação "Conferência de estoque em
 * <data>". Linhas iguais ao saldo são ignoradas.
 */
export function ConferirEstoque({ materiais, aoFechar }: { materiais: Material[]; aoFechar: () => void }) {
  const toast = useToast();
  const [state, formAction, pendente] = useActionState(conferirEstoque, undefined);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(materiais.map((m) => [m.id, saldoComoTexto(m.estoque_atual)]))
  );

  const calculo = ajustesDaConferencia(materiais.map((m) => ({ id: m.id, saldo: m.estoque_atual, contagem: valores[m.id] })));
  const alteradas = "ajustes" in calculo ? calculo.ajustes.length : 0;
  useActionSuccess(state, () => {
    if (alteradas > 0) toast.success(`${alteradas} item(ns) ajustado(s).`);
    aoFechar();
  });
  const difPorId = new Map("ajustes" in calculo ? calculo.ajustes.map((a) => [a.id, a.diferenca]) : []);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <div>
        <p className="text-sm font-medium text-zinc-100">Conferir estoque</p>
        <p className="text-xs text-zinc-500">
          Ajuste só o que mudou: a quantidade de cada item já vem preenchida. {observacaoConferencia()}.
        </p>
      </div>
      {materiais.length === 0 ? (
        <p className="text-xs text-zinc-500">Nenhum item para conferir.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800/80">
          {materiais.map((m) => {
            const un = rotuloUnidade(m);
            const saldo = saldoParaExibir(m.estoque_atual, m.unidade);
            const dif = difPorId.get(m.id);
            const lida = lerContagem(valores[m.id]);
            return (
              <li key={m.id} className="grid grid-cols-1 gap-2 px-3 py-2.5 sm:grid-cols-[1fr_12rem] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{m.nome}</p>
                  <p className="text-xs text-zinc-500">
                    No sistema: {saldo.principal}
                    {saldo.secundario ? ` · ${saldo.secundario}` : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-zinc-400" htmlFor={`conf-${m.id}`}>
                    Quanto tem agora? ({un})
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
              </li>
            );
          })}
        </ul>
      )}
      <ErroForm state={state} />
      {"error" in calculo && <p className="text-xs text-rose-400">{calculo.error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-zinc-500">
          {alteradas === 0 ? "Nenhuma linha alterada." : `${alteradas} linha(s) alterada(s).`}
        </span>
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente || alteradas === 0 || "error" in calculo}>
          {pendente ? "Salvando..." : "Salvar conferência"}
        </BotaoPrimario>
      </div>
    </form>
  );
}
