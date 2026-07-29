"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  buildPessoalDocumentoPath,
  uploadPessoalDocumentoArquivo,
  removePessoalDocumentoArquivo,
} from "@/lib/supabase/storage";
import { PessoalDocumentoSchema } from "@/lib/validations/pessoal-documento";
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

function parseDocumentoForm(formData: FormData) {
  return PessoalDocumentoSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") ?? "pessoal",
    expires_at: textOrNull(formData.get("expires_at")) ?? undefined,
    tags: textOrNull(formData.get("tags")) ?? undefined,
    notes: textOrNull(formData.get("notes")) ?? undefined,
  });
}

export async function createPessoalDocumento(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseDocumentoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("file"));
  const documentoId = randomUUID();
  let storagePath: string | null = null;

  if (arquivo) {
    storagePath = buildPessoalDocumentoPath(user.id, documentoId, arquivo.name);
    try {
      await uploadPessoalDocumentoArquivo(storagePath, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("pessoal_documents").insert({
    id: documentoId,
    user_id: user.id,
    name: parsed.data.name,
    category: parsed.data.category,
    storage_path: storagePath,
    expires_at: parsed.data.expires_at ?? null,
    tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
    notes: parsed.data.notes ?? null,
  });
  if (error) {
    if (storagePath) await removePessoalDocumentoArquivo(storagePath);
    return { error: "Não foi possível salvar o documento." };
  }

  revalidatePath("/pessoal/documentos");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function updatePessoalDocumento(
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

  const arquivo = fileOrNull(formData.get("file"));
  const update: Record<string, unknown> = {
    name: parsed.data.name,
    category: parsed.data.category,
    expires_at: parsed.data.expires_at ?? null,
    tags: parsed.data.tags ? inputToTags(parsed.data.tags) : [],
    notes: parsed.data.notes ?? null,
  };

  let novoPath: string | null = null;
  let pathAntigo: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("pessoal_documents")
      .select("storage_path")
      .eq("id", documentoId)
      .single();
    pathAntigo =
      (existente as { storage_path: string | null } | null)?.storage_path ??
      null;

    novoPath = buildPessoalDocumentoPath(user.id, documentoId, arquivo.name);
    try {
      await uploadPessoalDocumentoArquivo(novoPath, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.storage_path = novoPath;
  }

  const { error } = await supabase
    .from("pessoal_documents")
    .update(update)
    .eq("id", documentoId);
  if (error) {
    if (novoPath) await removePessoalDocumentoArquivo(novoPath);
    return { error: "Não foi possível atualizar o documento." };
  }

  if (pathAntigo) await removePessoalDocumentoArquivo(pathAntigo);

  revalidatePath("/pessoal/documentos");
  revalidatePath("/pessoal");
  return { ok: true };
}

export async function deletePessoalDocumento(documentoId: string) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("pessoal_documents")
    .select("storage_path")
    .eq("id", documentoId)
    .single();

  await supabase.from("pessoal_documents").delete().eq("id", documentoId);

  const path = (existente as { storage_path: string | null } | null)
    ?.storage_path;
  if (path) await removePessoalDocumentoArquivo(path);

  revalidatePath("/pessoal/documentos");
  revalidatePath("/pessoal");
}
