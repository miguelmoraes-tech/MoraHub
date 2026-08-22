"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  uploadClienteArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { ContratoSchema } from "@/lib/validations/contrato";
import { ComprovanteSchema } from "@/lib/validations/comprovante";
import { ServicoSchema } from "@/lib/validations/servico";
import { AssinaturaSchema } from "@/lib/validations/assinatura";
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

// ---------- Contratos ----------

export async function createContrato(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ContratoSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    vencimento: textOrNull(formData.get("vencimento")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      arquivo_path = await uploadClienteArquivo(user.id, clienteId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("contratos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    vencimento: parsed.data.vencimento ?? null,
    link: parsed.data.link ?? null,
    arquivo_path,
  });
  if (error) {
    if (arquivo_path) await removeClienteArquivo(arquivo_path);
    return { error: "Não foi possível salvar o contrato." };
  }

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateContrato(
  clienteId: string,
  contratoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ContratoSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    vencimento: textOrNull(formData.get("vencimento")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  const update: Record<string, unknown> = {
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    vencimento: parsed.data.vencimento ?? null,
    link: parsed.data.link ?? null,
  };

  let novoArquivoPath: string | null = null;
  let arquivoAntigoPath: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("contratos")
      .select("arquivo_path")
      .eq("id", contratoId)
      .single();
    arquivoAntigoPath = (existente as { arquivo_path: string | null } | null)
      ?.arquivo_path ?? null;

    try {
      novoArquivoPath = await uploadClienteArquivo(user.id, clienteId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("contratos")
    .update(update)
    .eq("id", contratoId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o contrato." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteContrato(clienteId: string, contratoId: string) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("contratos")
    .select("arquivo_path")
    .eq("id", contratoId)
    .single();

  await supabase.from("contratos").delete().eq("id", contratoId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)
    ?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Comprovantes ----------

export async function createComprovante(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ComprovanteSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  let arquivo_path: string | null = null;
  if (arquivo) {
    try {
      arquivo_path = await uploadClienteArquivo(user.id, clienteId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
  }

  const { error } = await supabase.from("comprovantes").insert({
    cliente_id: clienteId,
    user_id: user.id,
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    link: parsed.data.link ?? null,
    arquivo_path,
  });
  if (error) {
    if (arquivo_path) await removeClienteArquivo(arquivo_path);
    return { error: "Não foi possível salvar o comprovante." };
  }

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateComprovante(
  clienteId: string,
  comprovanteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ComprovanteSchema.safeParse({
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    data: textOrNull(formData.get("data")) ?? undefined,
    link: textOrNull(formData.get("link")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const arquivo = fileOrNull(formData.get("arquivo"));
  const update: Record<string, unknown> = {
    descricao: parsed.data.descricao,
    valor: parsed.data.valor,
    data: parsed.data.data ?? null,
    link: parsed.data.link ?? null,
  };

  let novoArquivoPath: string | null = null;
  let arquivoAntigoPath: string | null = null;
  if (arquivo) {
    const { data: existente } = await supabase
      .from("comprovantes")
      .select("arquivo_path")
      .eq("id", comprovanteId)
      .single();
    arquivoAntigoPath = (existente as { arquivo_path: string | null } | null)
      ?.arquivo_path ?? null;

    try {
      novoArquivoPath = await uploadClienteArquivo(user.id, clienteId, arquivo);
    } catch {
      return { error: "Não foi possível enviar o arquivo." };
    }
    update.arquivo_path = novoArquivoPath;
  }

  const { error } = await supabase
    .from("comprovantes")
    .update(update)
    .eq("id", comprovanteId);
  if (error) {
    if (novoArquivoPath) await removeClienteArquivo(novoArquivoPath);
    return { error: "Não foi possível atualizar o comprovante." };
  }

  if (arquivoAntigoPath) await removeClienteArquivo(arquivoAntigoPath);

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteComprovante(
  clienteId: string,
  comprovanteId: string
) {
  const { supabase } = await requireUser();

  const { data: existente } = await supabase
    .from("comprovantes")
    .select("arquivo_path")
    .eq("id", comprovanteId)
    .single();

  await supabase.from("comprovantes").delete().eq("id", comprovanteId);

  const arquivoPath = (existente as { arquivo_path: string | null } | null)
    ?.arquivo_path;
  if (arquivoPath) await removeClienteArquivo(arquivoPath);

  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Serviços ----------

export async function createServico(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ServicoSchema.safeParse({
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("servicos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    nome: parsed.data.nome,
  });
  if (error) return { error: "Não foi possível salvar o serviço." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateServico(
  clienteId: string,
  servicoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ServicoSchema.safeParse({
    nome: formData.get("nome"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("servicos")
    .update({ nome: parsed.data.nome })
    .eq("id", servicoId);
  if (error) return { error: "Não foi possível atualizar o serviço." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteServico(clienteId: string, servicoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("servicos").delete().eq("id", servicoId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Assinaturas ----------

export async function createAssinatura(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = AssinaturaSchema.safeParse({
    plano: formData.get("plano"),
    valor: textOrNull(formData.get("valor")) ?? undefined,
    recorrencia: formData.get("recorrencia") ?? "Mensal",
    data_inicio: textOrNull(formData.get("data_inicio")) ?? undefined,
    proxima_cobranca: textOrNull(formData.get("proxima_cobranca")) ?? undefined,
    status: formData.get("status") ?? "ativa",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("assinaturas").insert({
    cliente_id: clienteId,
    user_id: user.id,
    plano: parsed.data.plano,
    valor: parsed.data.valor ?? null,
    recorrencia: parsed.data.recorrencia,
    data_inicio: parsed.data.data_inicio ?? null,
    proxima_cobranca: parsed.data.proxima_cobranca ?? null,
    status: parsed.data.status,
  });
  if (error) return { error: "Não foi possível salvar a assinatura." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateAssinatura(
  clienteId: string,
  assinaturaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = AssinaturaSchema.safeParse({
    plano: formData.get("plano"),
    valor: textOrNull(formData.get("valor")) ?? undefined,
    recorrencia: formData.get("recorrencia") ?? "Mensal",
    data_inicio: textOrNull(formData.get("data_inicio")) ?? undefined,
    proxima_cobranca: textOrNull(formData.get("proxima_cobranca")) ?? undefined,
    status: formData.get("status") ?? "ativa",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("assinaturas")
    .update({
      plano: parsed.data.plano,
      valor: parsed.data.valor ?? null,
      recorrencia: parsed.data.recorrencia,
      data_inicio: parsed.data.data_inicio ?? null,
      proxima_cobranca: parsed.data.proxima_cobranca ?? null,
      status: parsed.data.status,
    })
    .eq("id", assinaturaId);
  if (error) return { error: "Não foi possível atualizar a assinatura." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteAssinatura(
  clienteId: string,
  assinaturaId: string
) {
  const { supabase } = await requireUser();
  await supabase.from("assinaturas").delete().eq("id", assinaturaId);
  revalidatePath(`/clientes/${clienteId}`);
}

