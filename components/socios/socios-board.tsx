"use client";

import { useState } from "react";
import { EquipeSection } from "@/components/socios/equipe-section";
import { SetoresSection } from "@/components/socios/setores-section";
import type {
  ConviteEquipe,
  ModuloPermissivel,
  PessoaEquipe,
  SetorAcesso,
} from "@/lib/socios-shared";

type Aba = "equipe" | "setores";

export function SociosBoard({
  modulos,
  membros,
  qtdFundadores,
  convites,
  setores,
  codigoVendedor,
  userId,
}: {
  modulos: ModuloPermissivel[];
  membros: PessoaEquipe[];
  /** Quantos fundadores (fundador + cofundadores) a empresa tem hoje. */
  qtdFundadores: number;
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
        <EquipeSection
          modulos={modulos}
          membros={membros}
          qtdFundadores={qtdFundadores}
          convites={convites}
          userId={userId}
        />
      ) : (
        <SetoresSection modulos={modulos} setores={setores} codigoVendedor={codigoVendedor} />
      )}
    </div>
  );
}
