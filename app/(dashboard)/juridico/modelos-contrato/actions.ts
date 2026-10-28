"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import {
  uploadModeloContratoArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { ModeloContratoSchema } from "@/lib/validations/modelo-contrato";
import { inputToTags } from "@/lib/pessoal/tags";
import type { ActionState } from "@/lib/actions/types";

const SEM_PERMISSAO = "Você não tem permissão para fazer isso.";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function fileOrNull(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) return null;
  return value.size > 0 ? value : null;
}

// A empresa é sempre a ativa: o formulário não escolhe conta (sem dono_id).
const ModeloEmpresaSchema = ModeloContratoSchema.omit({ dono_id: true });

function parseForm(formData: FormData) {
  return ModeloEmpresaSchema.safeParse({
    titulo: formData.get("titulo"),
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    conteudo: textOrNull(formData.get("conteudo")) ?? undefined,
    tags: textOrNull(formData.get("tags")) ?? undefined,
  });
}

export async function createModeloContrato(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      arquivo_path = await uploadModeloContratoArquivo(acesso.workspaceId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("modelos_contrato").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    titulo: parsed.data.titulo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    arquivo_path,
    tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
  });
  if (error) {
    if (arquivo_path) await removeClienteArquivo(arquivo_path);
    return { error: "Não foi possível salvar o modelo." };
  }

  revalidatePath("/juridico/modelos-contrato");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function updateModeloContrato(
  modeloId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();

  const update: Record<string, unknown> = {
    titulo: parsed.data.titulo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
    updated_at: new Date().toISOString(),
  };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let novoArquivoPath: string | null = null;
  let arquivoAntigoPath: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("modelos_contrato")
      .select("arquivo_path")
      .eq("id", modeloId)
      .eq("workspace_id", acesso.workspaceId)
      .single();
    arquivoAntigoPath =
      (existente as { arquivo_path: string | null } | null)?.arquivo_path ?? null;

    try {
      novoArquivoPath = await uploadModeloContratoArquivo(acesso.workspaceId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("modelos_contrato")
    .update(update)
    .eq("id", modeloId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o modelo." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath("/juridico/modelos-contrato");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function deleteModeloContrato(modeloId: string) {
  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return;
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("modelos_contrato")
    .select("arquivo_path")
    .eq("id", modeloId)
    .eq("workspace_id", acesso.workspaceId)
    .single();

  await supabase
    .from("modelos_contrato")
    .delete()
    .eq("id", modeloId)
    .eq("workspace_id", acesso.workspaceId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath("/juridico/modelos-contrato");
  revalidatePath("/juridico");
}
