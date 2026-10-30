"use client";

import { useState } from "react";
import { EquipeSection } from "@/components/socios/equipe-section";
import { SetoresSection } from "@/components/socios/setores-section";
import { CofundadorCodigo } from "@/components/socios/cofundador-codigo";
import { PedidosCofundador } from "@/components/socios/pedidos-cofundador";
import type {
  CodigoCofundador,
  ConviteEquipe,
  ModuloPermissivel,
  PedidoCofundador,
  PessoaEquipe,
  SetorAcesso,
} from "@/lib/socios-shared";

type Aba = "equipe" | "setores";

export function SociosBoard({
  modulos,
  membros,
  qtdFundadores,
  codigoCofundador,
  pedidosCofundador,
  convites,
  setores,
  codigoVendedor,
  userId,
}: {
  modulos: ModuloPermissivel[];
  membros: PessoaEquipe[];
  /** Quantos fundadores (fundador + cofundadores) a empresa tem hoje. */
  qtdFundadores: number;
  /** Código de cofundador ainda ativo (lido da tabela), se houver. */
  codigoCofundador: CodigoCofundador | null;
  /** Pedidos feitos com código de cofundador, pendentes. */
  pedidosCofundador: PedidoCofundador[];
  convites: ConviteEquipe[];
  setores: SetorAcesso[];
  codigoVendedor: string | null;
  userId: string;
}) {
  const [aba, setAba] = useState<Aba>("equipe");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {(
          [
            ["equipe", "Equipe"],
            ["setores", "Setores"],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => setAba(chave)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              aba === chave ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "equipe" ? (
        <div className="space-y-6">
        <CofundadorCodigo ativo={codigoCofundador} />
        <PedidosCofundador pedidos={pedidosCofundador} qtdFundadores={qtdFundadores} />
        <EquipeSection
          modulos={modulos}
          membros={membros}
          qtdFundadores={qtdFundadores}
          convites={convites}
          userId={userId}
        />
        </div>
      ) : (
        <SetoresSection modulos={modulos} setores={setores} codigoVendedor={codigoVendedor} />
      )}
    </div>
  );
}
