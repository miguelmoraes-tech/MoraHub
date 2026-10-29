"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { formParaObjeto, primeiroErro } from "@/lib/impressao-3d/validacao";
import { IntegracaoSchema } from "@/lib/impressao-3d/validacao-nicho";
import { mesclarConfig, validarConfigIntegracao } from "@/lib/impressao-3d/integracoes";
import type { ActionState } from "@/lib/actions/types";
import type { Json } from "@/lib/supabase/database.types";

const MODULO = "p3d_integracoes";

/**
 * Salva a configuração NÃO secreta de uma integração (tipo, ativo e config) por upsert direto.
 * Só fundador/cofundador altera. status, segredo_configurado, ultima_verificacao e ultimo_erro são
 * do servidor: nunca são enviados (o banco os ignora). Nada aqui conecta ou testa um serviço.
 */
export async function salvarIntegracao(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bruto = formParaObjeto(formData);
  const parsed = IntegracaoSchema.safeParse(bruto);
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso?.ehDono) return { error: SEM_PERMISSAO };

  const { tipo, ativo } = parsed.data;
  const validada = validarConfigIntegracao(tipo, bruto);
  if (!validada.ok) return { error: validada.erro };

  const supabase = await createClient();
  // Preserva o que o servidor já tenha posto na config (só as chaves do tipo são trocadas).
  const { data: atual } = await supabase
    .from("p3d_integracoes")
    .select("config")
    .eq("workspace_id", acesso.workspaceId)
    .eq("tipo", tipo)
    .maybeSingle();
  const config = mesclarConfig((atual as { config?: unknown } | null)?.config, tipo, validada.config);

  const { error } = await supabase
    .from("p3d_integracoes")
    .upsert(
      { workspace_id: acesso.workspaceId, tipo, ativo, config: config as Json },
      { onConflict: "workspace_id,tipo" }
    );
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a integração.") };

  revalidatePath("/impressao-3d/integracoes");
  return { ok: true };
}
