"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actions/types";

/**
 * Liga/desliga um módulo da empresa do dono. A decisão é do banco:
 * `definir_modulo` só aceita o dono e valida `depende_de`. Desligar só oculta
 * e bloqueia as rotas — nenhum dado é apagado.
 */
export async function definirModulo(
  chave: string,
  habilitado: boolean
): Promise<NonNullable<ActionState>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // A empresa vem do banco (a do próprio usuário), nunca do cliente.
  const workspaceId = await getWorkspaceIdAtivo();
  if (!workspaceId) return { error: "Empresa não encontrada." };

  const { error } = await supabase.rpc("definir_modulo", {
    p_workspace_id: workspaceId,
    p_chave: chave,
    p_habilitado: habilitado,
  });
  if (error) {
    // P0001 = RAISE EXCEPTION da função, que já vem em texto claro.
    return {
      error:
        error.code === "P0001" && error.message
          ? error.message
          : "Não foi possível atualizar o módulo. Tente novamente.",
    };
  }

  // Menu, home e proxy dependem dos módulos ligados.
  revalidatePath("/", "layout");
  return { ok: true };
}
