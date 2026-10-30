"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import {
  ImpressoraSchema,
  ManutencaoSchema,
  PecaDesgasteSchema,
  formParaObjeto,
  primeiroErro,
} from "@/lib/impressao-3d/validacao";
import { lerComprador, validarDataCompra } from "@/lib/impressao-3d/comprador";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_impressoras";
const ROTA = "/impressao-3d/impressoras";

/** Quem comprou (seletor) e a data da compra (data_aquisicao, nunca no futuro). */
function lerQuemComprou(formData: FormData) {
  const c = lerComprador((campo) => formData.get(campo));
  if ("error" in c) return c;
  const d = validarDataCompra(formData.get("data_aquisicao"));
  if ("error" in d) return d;
  return c;
}

export async function criarImpressora(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ImpressoraSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const quem = lerQuemComprou(formData);
  if ("error" in quem) return { error: quem.error };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_impressoras")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data, ...quem.comprador });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a impressora.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarImpressora(
  impressoraId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ImpressoraSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const quem = lerQuemComprou(formData);
  if ("error" in quem) return { error: quem.error };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_impressoras")
    .update({ ...parsed.data, ...quem.comprador })
    .eq("id", impressoraId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a impressora.") };

  revalidatePath(ROTA);
  return { ok: true };
}

/** Arquivar (ativo=false) esconde da escolha em simulações sem apagar o histórico. */
export async function alternarImpressoraAtiva(impressoraId: string, ativo: boolean): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_impressoras")
    .update({ ativo })
    .eq("id", impressoraId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível alterar a impressora.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirImpressora(impressoraId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_impressoras")
    .delete()
    .eq("id", impressoraId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a impressora.") };

  revalidatePath(ROTA);
  return { ok: true };
}

// --- Peças de desgaste --------------------------------------------------------

export async function criarPecaDesgaste(
  impressoraId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PecaDesgasteSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const quem = lerComprador((campo) => formData.get(campo));
  if ("error" in quem) return { error: quem.error };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_pecas_desgaste")
    .insert({ workspace_id: acesso.workspaceId, impressora_id: impressoraId, ...parsed.data, ...quem.comprador });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a peça.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarPecaDesgaste(
  pecaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = PecaDesgasteSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };
  const quem = lerComprador((campo) => formData.get(campo));
  if ("error" in quem) return { error: quem.error };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_pecas_desgaste")
    .update({ ...parsed.data, ...quem.comprador })
    .eq("id", pecaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a peça.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirPecaDesgaste(pecaId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_pecas_desgaste")
    .delete()
    .eq("id", pecaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a peça.") };

  revalidatePath(ROTA);
  return { ok: true };
}

// --- Manutenções --------------------------------------------------------------

/**
 * Registra a manutenção; sendo preventiva, também marca as horas da última
 * manutenção da impressora (zera o alerta). São duas escritas: se a segunda
 * falhar, a manutenção fica registrada e o erro diz o que faltou.
 */
export async function registrarManutencao(
  impressoraId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ManutencaoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: impressora, error: erroLeitura } = await supabase
    .from("p3d_impressoras")
    .select("horas_uso")
    .eq("id", impressoraId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (erroLeitura || !impressora) return { error: "Impressora não encontrada." };

  const horas = parsed.data.horas_uso_no_momento ?? Number(impressora.horas_uso);
  const { error } = await supabase.from("p3d_manutencoes").insert({
    workspace_id: acesso.workspaceId,
    impressora_id: impressoraId,
    tipo: parsed.data.tipo,
    descricao: parsed.data.descricao,
    custo: parsed.data.custo,
    // Sem data informada, vale o padrão do banco (hoje).
    ...(parsed.data.data ? { data: parsed.data.data } : {}),
    horas_uso_no_momento: horas,
  });
  if (error) return { error: mensagemEscrita(error, "Não foi possível registrar a manutenção.") };

  if (parsed.data.tipo === "preventiva") {
    const { error: erroAtualizar } = await supabase
      .from("p3d_impressoras")
      .update({ horas_ultima_manutencao: horas })
      .eq("id", impressoraId)
      .eq("workspace_id", acesso.workspaceId);
    if (erroAtualizar) {
      revalidatePath(ROTA);
      return {
        error:
          "A manutenção foi registrada, mas não foi possível atualizar as horas da última manutenção da impressora. Edite a impressora e ajuste o campo.",
      };
    }
  }

  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirManutencao(manutencaoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("p3d_manutencoes")
    .delete()
    .eq("id", manutencaoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a manutenção.") };

  revalidatePath(ROTA);
  return { ok: true };
}
