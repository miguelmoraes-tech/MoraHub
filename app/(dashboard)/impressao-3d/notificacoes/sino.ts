"use server";

import { getAcessoModulo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { COLUNAS_NOTIFICACAO, lerNotificacoes, type Notificacao } from "@/lib/impressao-3d/alertas";

/** `itens` é null para quem só tem o Dashboard: atualiza os alertas mas não lista notificações. */
export type ResultadoAlertas = { error: string } | { ok: true; total: number; itens: Notificacao[] | null };

const LIMITE_SINO = 100;

/**
 * Gera e resolve os alertas da empresa ativa (p3d_atualizar_alertas) e devolve as notificações
 * abertas. Pode quem tem leitura em Automações OU em Dashboard; só Automações lista as notificações
 * (policy própria no banco). O limite de frequência (60 s) é do cliente; o banco decide o resto.
 */
export async function atualizarAlertas(): Promise<ResultadoAlertas> {
  const [automacoes, dashboard] = await Promise.all([
    getAcessoModulo("p3d_automacoes"),
    getAcessoModulo("p3d_dashboard"),
  ]);
  const acesso = automacoes ?? dashboard;
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("p3d_atualizar_alertas", { p_ws: acesso.workspaceId });
  if (error) return { error: mensagemRpc(error, "Não foi possível atualizar os alertas.") };
  const total = Number(data) || 0;
  if (!automacoes) return { ok: true, total, itens: null };

  const { data: linhas, error: erroLista } = await supabase
    .from("p3d_notificacoes")
    .select(COLUNAS_NOTIFICACAO)
    .eq("workspace_id", automacoes.workspaceId)
    .is("resolvida_em", null)
    .order("created_at", { ascending: false })
    .limit(LIMITE_SINO);
  if (erroLista) return { error: mensagemRpc(erroLista, "Não foi possível listar as notificações.") };
  return { ok: true, total, itens: lerNotificacoes(linhas) };
}
