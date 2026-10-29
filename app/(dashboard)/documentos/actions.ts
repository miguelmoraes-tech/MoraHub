"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAcessoEdicao, getAcessoModulo } from "@/lib/empresa-ativa";
import {
  uploadDocumentoArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { DocumentoSchema } from "@/lib/validations/documento";
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

/**
 * O vínculo com o cliente só muda para quem lê o módulo Clientes (o formulário
 * nem oferece o campo sem ele): sem essa permissão, criar grava sem cliente e
 * editar preserva o vínculo que já existe. O cliente, quando vem, precisa ser
 * da empresa ativa.
 */
async function resolverCliente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  clienteId: string | undefined
): Promise<{ ok: true; mudar: boolean; clienteId: string | null } | { ok: false }> {
  const acessoClientes = await getAcessoModulo("clientes");
  if (!acessoClientes) return { ok: true, mudar: false, clienteId: null };
  if (!clienteId) return { ok: true, mudar: true, clienteId: null };
  const { data } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return data ? { ok: true, mudar: true, clienteId } : { ok: false };
}

function parseSignatarios(formData: FormData) {
  const raw = formData.get("signatarios");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseDocumentoForm(formData: FormData) {
  const precisaAssinatura = formData.get("precisa_assinatura") === "on";
  return DocumentoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo") ?? "nota",
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    cliente_id: textOrNull(formData.get("cliente_id")) ?? undefined,
    conteudo: textOrNull(formData.get("conteudo")) ?? undefined,
    data: textOrNull(formData.get("data")) ?? undefined,
    precisa_assinatura: precisaAssinatura,
    status_assinatura: precisaAssinatura
      ? ((formData.get("status_assinatura") as string) ?? "pendente")
      : undefined,
    signatarios: precisaAssinatura ? parseSignatarios(formData) : [],
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

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, acesso.workspaceId, parsed.data.cliente_id);
  if (!cliente.ok) return { error: "Cliente inválido." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      // Arquivos novos ficam na pasta da empresa (<workspace_id>/documentos/...).
      arquivo_path = await uploadDocumentoArquivo(acesso.workspaceId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("documentos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    cliente_id: cliente.clienteId,
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    arquivo_path,
    data: parsed.data.data ?? null,
    precisa_assinatura: parsed.data.precisa_assinatura,
    status_assinatura: parsed.data.status_assinatura ?? null,
    signatarios: parsed.data.signatarios,
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

  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return { error: SEM_PERMISSAO };
  const supabase = await createClient();
  const cliente = await resolverCliente(supabase, acesso.workspaceId, parsed.data.cliente_id);
  if (!cliente.ok) return { error: "Cliente inválido." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  const update: Record<string, unknown> = {
    ...(cliente.mudar ? { cliente_id: cliente.clienteId } : {}),
    titulo: parsed.data.titulo,
    tipo: parsed.data.tipo,
    categoria: parsed.data.categoria ?? null,
    conteudo: parsed.data.conteudo ?? null,
    data: parsed.data.data ?? null,
    precisa_assinatura: parsed.data.precisa_assinatura,
    status_assinatura: parsed.data.status_assinatura ?? null,
    signatarios: parsed.data.signatarios,
  };

  let novoArquivoPath: string | null = null;
  let arquivoAntigoPath: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("documentos")
      .select("arquivo_path")
      .eq("id", documentoId)
      .eq("workspace_id", acesso.workspaceId)
      .single();
    arquivoAntigoPath =
      (existente as { arquivo_path: string | null } | null)?.arquivo_path ??
      null;

    try {
      novoArquivoPath = await uploadDocumentoArquivo(acesso.workspaceId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("documentos")
    .update(update)
    .eq("id", documentoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o documento." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath("/documentos");
  return { ok: true };
}

export async function deleteDocumento(documentoId: string) {
  const acesso = await getAcessoEdicao("juridico");
  if (!acesso) return;
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("documentos")
    .select("arquivo_path")
    .eq("id", documentoId)
    .eq("workspace_id", acesso.workspaceId)
    .single();

  await supabase
    .from("documentos")
    .delete()
    .eq("id", documentoId)
    .eq("workspace_id", acesso.workspaceId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)
    ?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath("/documentos");
}
