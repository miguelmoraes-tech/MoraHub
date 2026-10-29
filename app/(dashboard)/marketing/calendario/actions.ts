"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { CalendarioConteudoSchema } from "@/lib/validations/calendario-conteudo";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function parseForm(formData: FormData) {
  return CalendarioConteudoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "post",
    canal: formData.get("canal") ?? "instagram",
    data_publicacao: textOrNull(formData.get("data_publicacao")) ?? undefined,
    status: formData.get("status") ?? "planejado",
    conteudo: textOrNull(formData.get("conteudo")) ?? undefined,
    link_publicado: textOrNull(formData.get("link_publicado")) ?? undefined,
    responsavel_id: textOrNull(formData.get("responsavel_id")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createConteudo(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("marketing");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase.from("calendario_conteudo").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    canal: parsed.data.canal,
    data_publicacao: parsed.data.data_publicacao ?? null,
    status: parsed.data.status,
    conteudo: parsed.data.conteudo ?? null,
    link_publicado: parsed.data.link_publicado ?? null,
    responsavel_id: parsed.data.responsavel_id ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o conteúdo." };

  revalidatePath("/marketing/calendario");
  revalidatePath("/marketing");
  return { ok: true };
}

export async function updateConteudo(
  conteudoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("marketing");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("calendario_conteudo")
    .update({
      titulo: parsed.data.titulo,
      tipo: parsed.data.tipo,
      canal: parsed.data.canal,
      data_publicacao: parsed.data.data_publicacao ?? null,
      status: parsed.data.status,
      conteudo: parsed.data.conteudo ?? null,
      link_publicado: parsed.data.link_publicado ?? null,
      responsavel_id: parsed.data.responsavel_id ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", conteudoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o conteúdo." };

  revalidatePath("/marketing/calendario");
  revalidatePath("/marketing");
  return { ok: true };
}

export async function deleteConteudo(conteudoId: string) {
  const acesso = await getAcessoEdicao("marketing");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("calendario_conteudo")
    .delete()
    .eq("id", conteudoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidatePath("/marketing/calendario");
  revalidatePath("/marketing");
}
