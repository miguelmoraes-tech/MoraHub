"use client";

import { useActionState, useState } from "react";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { BotaoPrimario, BotaoTexto, ErroForm } from "@/components/impressao-3d/campos";
import { CamposComprador } from "@/components/impressao-3d/campos-comprador";
import { seletorDeComprador, type Comprador, type PessoaComprador } from "@/lib/impressao-3d/comprador";
import type { ActionState } from "@/lib/actions/types";

/**
 * "Corrigir comprador" de uma entrada de estoque ou de uma compra já recebida. `acao` é a server action
 * já ligada ao id (p3d_corrigir_comprador no servidor). O botão abre um formulário curto, em coluna
 * única no celular.
 */
export function CorrigirComprador({
  acao,
  atual,
  pessoas,
  rotulo = "Corrigir comprador",
}: {
  acao: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  atual: Comprador;
  pessoas: PessoaComprador[];
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, () => setAberto(false));

  if (!aberto) return <BotaoTexto onClick={() => setAberto(true)}>{rotulo}</BotaoTexto>;
  return (
    <form action={formAction} className="min-w-64 space-y-2 rounded-lg border border-copper-500/30 bg-zinc-950/80 p-3 text-left">
      <CamposComprador
        pessoas={pessoas}
        inicial={{ seletor: seletorDeComprador(atual, pessoas), nome: atual.comprador_nome }}
      />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={() => setAberto(false)}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}
