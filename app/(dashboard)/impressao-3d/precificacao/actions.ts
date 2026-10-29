"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { ConfigSchema, formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import type { ActionState } from "@/lib/actions/types";

/**
 * Configurações de precificação da empresa (1 linha por empresa). Update/upsert
 * direto, só dos campos de configuração. A linha inicial nasce por
 * p3d_garantir_config (chamada pela página).
 */
export async function salvarConfigPrecificacao(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ConfigSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao("p3d_precificacao");
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_config_precificacao")
    .upsert(
      { workspace_id: acesso.workspaceId, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "workspace_id" }
    );
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar as configurações.") };

  revalidatePath("/impressao-3d/precificacao");
  return { ok: true };
}
