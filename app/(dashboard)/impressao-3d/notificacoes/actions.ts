"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita, mensagemRpc } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import { ConfigAlertasSchema } from "@/lib/impressao-3d/validacao-nicho";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_automacoes";
const ROTA = "/impressao-3d/notificacoes";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marca uma notificação como lida (ou não lida) por p3d_marcar_notificacao. As notificações são
 * somente leitura para o app: nunca há insert/update direto em p3d_notificacoes.
 */
export async function marcarNotificacao(id: string, lida: boolean): Promise<ActionState> {
  if (!UUID.test(id)) return { error: "Notificação inválida." };
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient()).rpc("p3d_marcar_notificacao", { p_id: id, p_lida: lida });
  if (error) return { error: mensagemRpc(error, "Não foi possível atualizar a notificação.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/**
 * Limites dos alertas da empresa (1 linha por empresa, criada pelo banco na primeira atualização).
 * Update direto só dos 8 campos editáveis, filtrado pela empresa ativa; se a linha ainda não existir
 * o update não afeta nada e a tela pede para abrir o painel/sino antes.
 */
export async function salvarConfigAlertas(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ConfigAlertasSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { data, error } = await (await createClient())
    .from("p3d_config_alertas")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("workspace_id", acesso.workspaceId)
    .select("workspace_id");
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a configuração dos alertas.") };
  if (!data || data.length === 0) {
    return { error: "A configuração ainda não existe. Abra o sino de alertas (ou o Dashboard) para o banco criá-la e tente de novo." };
  }

  revalidatePath(`${ROTA}/alertas`);
  return { ok: true };
}
