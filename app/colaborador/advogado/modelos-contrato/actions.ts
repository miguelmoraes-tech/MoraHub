"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadModeloContratoArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { ModeloContratoSchema } from "@/lib/validations/modelo-contrato";
import { inputToTags } from "@/lib/pessoal/tags";
import type { ActionState } from "@/lib/actions/types";

function textOrNull(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = value.toString().trim();
  return str === "" ? null : str;
}

function fileOrNull(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) return null;
  return value.size > 0 ? value : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function parseForm(formData: FormData) {
  return ModeloContratoSchema.safeParse({
    dono_id: formData.get("dono_id"),
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

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      arquivo_path = await uploadModeloContratoArquivo(user.id, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  // RLS ("dono ou advogado vinculado") rejects the insert if dono_id isn't
  // the caller's own account or a conta where they're an active advogado —
  // no need to re-verify the link here.
  const { error } = await supabase.from("modelos_contrato").insert({
    user_id: parsed.data.dono_id,
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

  revalidatePath("/colaborador/advogado/modelos-contrato");
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

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const update: Record<string, unknown> = {
    user_id: parsed.data.dono_id,
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
      .single();
    arquivoAntigoPath =
      (existente as { arquivo_path: string | null } | null)?.arquivo_path ??
      null;

    try {
      novoArquivoPath = await uploadModeloContratoArquivo(user.id, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("modelos_contrato")
    .update(update)
    .eq("id", modeloId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o modelo." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath("/colaborador/advogado/modelos-contrato");
  revalidatePath("/juridico");
  return { ok: true };
}

export async function deleteModeloContrato(modeloId: string) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("modelos_contrato")
    .select("arquivo_path")
    .eq("id", modeloId)
    .single();

  await supabase.from("modelos_contrato").delete().eq("id", modeloId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)
    ?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath("/colaborador/advogado/modelos-contrato");
  revalidatePath("/juridico");
}
