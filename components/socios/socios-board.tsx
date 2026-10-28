"use client";

import { useState } from "react";
import { EquipeSection } from "@/components/socios/equipe-section";
import { SetoresSection } from "@/components/socios/setores-section";
import type {
  ConviteEquipe,
  MembroEquipe,
  ModuloPermissivel,
  SetorAcesso,
} from "@/lib/socios-shared";

type Aba = "equipe" | "setores";

export function SociosBoard({
  modulos,
  membros,
  convites,
  setores,
  codigoVendedor,
  ehFundador,
  userId,
}: {
  modulos: ModuloPermissivel[];
  membros: MembroEquipe[];
  convites: ConviteEquipe[];
  setores: SetorAcesso[];
  codigoVendedor: string | null;
  /** Só o fundador convida e remove cofundador. */
  ehFundador: boolean;
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
          convites={convites}
          ehFundador={ehFundador}
          userId={userId}
        />
      ) : (
        <SetoresSection modulos={modulos} setores={setores} codigoVendedor={codigoVendedor} />
      )}
    </div>
  );
}
