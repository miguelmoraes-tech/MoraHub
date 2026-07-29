"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadDocumentoArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { DocumentoSchema } from "@/lib/validations/documento";
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

function parseDocumentoForm(formData: FormData) {
  return DocumentoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "nota",
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    cliente_id: textOrNull(formData.get("cliente_id")) ?? undefined,
    conteudo: textOrNull(formData.get("conteudo")) ?? undefined,
    data: textOrNull(formData.get("data")) ?? undefined,
  });
}

export async function createDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseDocumentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      arquivo_path = await uploadDocumentoArquivo(user.id, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("documentos").insert({
    user_id: user.id,
    cliente_id: parsed.data.cliente_id ?? null,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    arquivo_path,
    data: parsed.data.data ?? null,
  });
  if (error) {
    if (arquivo_path) await removeClienteArquivo(arquivo_path);
    return { error: "Não foi possível salvar o documento." };
  }

  revalidatePath("/documentos");
  return { ok: true };
}

export async function updateDocumento(
  documentoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseDocumentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  const update: Record<string, unknown> = {
    cliente_id: parsed.data.cliente_id ?? null,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    data: parsed.data.data ?? null,
  };

  let novoArquivoPath: string | null = null;
  let arquivoAntigoPath: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("documentos")
      .select("arquivo_path")
      .eq("id", documentoId)
      .single();
    arquivoAntigoPath =
      (existente as { arquivo_path: string | null } | null)?.arquivo_path ??
      null;

    try {
      novoArquivoPath = await uploadDocumentoArquivo(user.id, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("documentos")
    .update(update)
    .eq("id", documentoId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o documento." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath("/documentos");
  return { ok: true };
}

export async function deleteDocumento(documentoId: string) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("documentos")
    .select("arquivo_path")
    .eq("id", documentoId)
    .single();

  await supabase.from("documentos").delete().eq("id", documentoId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)
    ?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath("/documentos");
}
