"use client";

import { useState } from "react";
import { CLASSE_CAMPO, Campo } from "@/components/impressao-3d/campos";
import {
  COMPRADOR_NENHUM, COMPRADOR_NOME_MAX, COMPRADOR_OUTRO, ROTULO_NAO_INFORMADO,
  rotuloOpcaoPessoa, seletorInicial, type PessoaComprador,
} from "@/lib/impressao-3d/comprador";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";

/**
 * "Quem comprou" (seletor com as pessoas da empresa + "Outra pessoa", que abre um campo de nome) e,
 * se `nomeData` vier, "Data da compra" (padrão hoje, máximo hoje). Os nomes dos campos são os que as
 * actions leem: comprador, comprador_nome e a data. Em coluna única no celular, com campos de 16 px.
 */
export function CamposComprador({
  pessoas,
  usuarioId,
  inicial,
  nomeData,
  rotuloData = "Data da compra",
  dataInicial,
  className = "",
}: {
  pessoas: PessoaComprador[];
  /** Usuário logado: vira o padrão do seletor quando não há `inicial`. */
  usuarioId?: string | null;
  /** Seletor já escolhido (edição): id da pessoa, COMPRADOR_OUTRO ou "". */
  inicial?: { seletor: string; nome?: string | null };
  /** Nome do campo da data; sem ele não mostra a data. */
  nomeData?: string;
  rotuloData?: string;
  dataInicial?: string | null;
  className?: string;
}) {
  const [seletor, setSeletor] = useState(inicial?.seletor ?? seletorInicial(usuarioId, pessoas));
  const hoje = hojeSaoPaulo();

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`}>
      <Campo rotulo="Quem comprou">
        <select
          name="comprador"
          value={seletor}
          onChange={(e) => setSeletor(e.target.value)}
          aria-label="Quem comprou"
          className={CLASSE_CAMPO}
        >
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>{rotuloOpcaoPessoa(p)}</option>
          ))}
          <option value={COMPRADOR_OUTRO}>Outra pessoa (digitar nome)</option>
          <option value={COMPRADOR_NENHUM}>{ROTULO_NAO_INFORMADO}</option>
        </select>
      </Campo>
      {nomeData && (
        <Campo rotulo={rotuloData} ajuda="Não pode ser depois de hoje.">
          <input
            type="date"
            name={nomeData}
            max={hoje}
            defaultValue={dataInicial ?? hoje}
            aria-label={rotuloData}
            className={CLASSE_CAMPO}
          />
        </Campo>
      )}
      {seletor === COMPRADOR_OUTRO && (
        <Campo rotulo="Nome de quem comprou" className="sm:col-span-2">
          <input
            name="comprador_nome"
            maxLength={COMPRADOR_NOME_MAX}
            required
            defaultValue={inicial?.nome ?? ""}
            placeholder="Ex.: Maria (sócia)"
            aria-label="Nome de quem comprou"
            className={CLASSE_CAMPO}
          />
        </Campo>
      )}
    </div>
  );
}
