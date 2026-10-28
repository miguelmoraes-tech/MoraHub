"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import {
  uploadClienteArquivo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { ContratoSchema } from "@/lib/validations/contrato";
import { ComprovanteSchema } from "@/lib/validations/comprovante";
import { ServicoSchema } from "@/lib/validations/servico";
import { AssinaturaSchema } from "@/lib/validations/assinatura";
import { AcessoSchema } from "@/lib/validations/acesso";
import { InfraestruturaSchema } from "@/lib/validations/infraestrutura";
import { ProjetoSchema } from "@/lib/validations/projeto";
import { ManutencaoSchema } from "@/lib/validations/manutencao";
import { BackupSchema } from "@/lib/validations/backup";
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
  // Empresa ativa em que o usuário é dono (null = sem painel nela). Toda linha
  // criada aqui grava o workspace_id dela — nunca só o user_id.
  const workspaceId = await getWorkspaceIdAtivo();
  return { supabase, user, workspaceId };
}

const SEM_EMPRESA = { error: "Selecione uma empresa em que você é o dono." } as const;

/** O cliente precisa ser da empresa ativa antes de pendurar qualquer coisa nele. */
async function clienteDaEmpresa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string,
  workspaceId: string
) {
  const { data } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return !!data;
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

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
    workspace_id: workspaceId,
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;

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
      .eq("workspace_id", workspaceId)
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
  const { supabase, workspaceId } = await requireUser();

  const { data: existente } = await supabase
    .from("contratos")
    .select("arquivo_path")
    .eq("id", contratoId)
    .eq("workspace_id", workspaceId ?? "")
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

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
    workspace_id: workspaceId,
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;

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
      .eq("workspace_id", workspaceId)
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
  const { supabase, workspaceId } = await requireUser();

  const { data: existente } = await supabase
    .from("comprovantes")
    .select("arquivo_path")
    .eq("id", comprovanteId)
    .eq("workspace_id", workspaceId ?? "")
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("servicos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
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

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("assinaturas").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
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

// ---------- Acessos ----------

export async function createAcesso(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = AcessoSchema.safeParse({
    nome_servico: formData.get("nome_servico"),
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    url_login: textOrNull(formData.get("url_login")) ?? undefined,
    usuario: textOrNull(formData.get("usuario")) ?? undefined,
    email: textOrNull(formData.get("email")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
    referencia_senha: textOrNull(formData.get("referencia_senha")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("acessos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
    nome_servico: parsed.data.nome_servico,
    categoria: parsed.data.categoria ?? null,
    url_login: parsed.data.url_login ?? null,
    usuario: parsed.data.usuario ?? null,
    email: parsed.data.email ?? null,
    observacoes: parsed.data.observacoes ?? null,
    referencia_senha: parsed.data.referencia_senha ?? null,
  });
  if (error) return { error: "Não foi possível salvar o acesso." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateAcesso(
  clienteId: string,
  acessoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = AcessoSchema.safeParse({
    nome_servico: formData.get("nome_servico"),
    categoria: textOrNull(formData.get("categoria")) ?? undefined,
    url_login: textOrNull(formData.get("url_login")) ?? undefined,
    usuario: textOrNull(formData.get("usuario")) ?? undefined,
    email: textOrNull(formData.get("email")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
    referencia_senha: textOrNull(formData.get("referencia_senha")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("acessos")
    .update({
      nome_servico: parsed.data.nome_servico,
      categoria: parsed.data.categoria ?? null,
      url_login: parsed.data.url_login ?? null,
      usuario: parsed.data.usuario ?? null,
      email: parsed.data.email ?? null,
      observacoes: parsed.data.observacoes ?? null,
      referencia_senha: parsed.data.referencia_senha ?? null,
    })
    .eq("id", acessoId);
  if (error) return { error: "Não foi possível atualizar o acesso." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteAcesso(clienteId: string, acessoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("acessos").delete().eq("id", acessoId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Infraestrutura ----------

export async function createInfraestrutura(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = InfraestruturaSchema.safeParse({
    dominio: formData.get("dominio"),
    hospedagem: textOrNull(formData.get("hospedagem")) ?? undefined,
    servidor: textOrNull(formData.get("servidor")) ?? undefined,
    dns: textOrNull(formData.get("dns")) ?? undefined,
    ssl: textOrNull(formData.get("ssl")) ?? undefined,
    cdn: textOrNull(formData.get("cdn")) ?? undefined,
    contas_email: textOrNull(formData.get("contas_email")) ?? undefined,
    tecnologias: textOrNull(formData.get("tecnologias")) ?? undefined,
    data_renovacao: textOrNull(formData.get("data_renovacao")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("infraestrutura").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
    dominio: parsed.data.dominio,
    hospedagem: parsed.data.hospedagem ?? null,
    servidor: parsed.data.servidor ?? null,
    dns: parsed.data.dns ?? null,
    ssl: parsed.data.ssl ?? null,
    cdn: parsed.data.cdn ?? null,
    contas_email: parsed.data.contas_email ?? null,
    tecnologias: parsed.data.tecnologias ?? null,
    data_renovacao: parsed.data.data_renovacao ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a infraestrutura." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateInfraestrutura(
  clienteId: string,
  infraestruturaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = InfraestruturaSchema.safeParse({
    dominio: formData.get("dominio"),
    hospedagem: textOrNull(formData.get("hospedagem")) ?? undefined,
    servidor: textOrNull(formData.get("servidor")) ?? undefined,
    dns: textOrNull(formData.get("dns")) ?? undefined,
    ssl: textOrNull(formData.get("ssl")) ?? undefined,
    cdn: textOrNull(formData.get("cdn")) ?? undefined,
    contas_email: textOrNull(formData.get("contas_email")) ?? undefined,
    tecnologias: textOrNull(formData.get("tecnologias")) ?? undefined,
    data_renovacao: textOrNull(formData.get("data_renovacao")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("infraestrutura")
    .update({
      dominio: parsed.data.dominio,
      hospedagem: parsed.data.hospedagem ?? null,
      servidor: parsed.data.servidor ?? null,
      dns: parsed.data.dns ?? null,
      ssl: parsed.data.ssl ?? null,
      cdn: parsed.data.cdn ?? null,
      contas_email: parsed.data.contas_email ?? null,
      tecnologias: parsed.data.tecnologias ?? null,
      data_renovacao: parsed.data.data_renovacao ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", infraestruturaId);
  if (error) return { error: "Não foi possível atualizar a infraestrutura." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteInfraestrutura(
  clienteId: string,
  infraestruturaId: string
) {
  const { supabase } = await requireUser();
  await supabase.from("infraestrutura").delete().eq("id", infraestruturaId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Projetos ----------

export async function createProjeto(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ProjetoSchema.safeParse({
    nome: formData.get("nome"),
    tipo: textOrNull(formData.get("tipo")) ?? undefined,
    status: formData.get("status") ?? "planejado",
    escopo: textOrNull(formData.get("escopo")) ?? undefined,
    tecnologias: textOrNull(formData.get("tecnologias")) ?? undefined,
    links: textOrNull(formData.get("links")) ?? undefined,
    repositorio_git: textOrNull(formData.get("repositorio_git")) ?? undefined,
    deploy_url: textOrNull(formData.get("deploy_url")) ?? undefined,
    documentacao_link: textOrNull(formData.get("documentacao_link")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("projetos").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
    nome: parsed.data.nome,
    tipo: parsed.data.tipo ?? null,
    status: parsed.data.status,
    escopo: parsed.data.escopo ?? null,
    tecnologias: parsed.data.tecnologias ?? null,
    links: parsed.data.links ?? null,
    repositorio_git: parsed.data.repositorio_git ?? null,
    deploy_url: parsed.data.deploy_url ?? null,
    documentacao_link: parsed.data.documentacao_link ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar o projeto." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateProjeto(
  clienteId: string,
  projetoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ProjetoSchema.safeParse({
    nome: formData.get("nome"),
    tipo: textOrNull(formData.get("tipo")) ?? undefined,
    status: formData.get("status") ?? "planejado",
    escopo: textOrNull(formData.get("escopo")) ?? undefined,
    tecnologias: textOrNull(formData.get("tecnologias")) ?? undefined,
    links: textOrNull(formData.get("links")) ?? undefined,
    repositorio_git: textOrNull(formData.get("repositorio_git")) ?? undefined,
    deploy_url: textOrNull(formData.get("deploy_url")) ?? undefined,
    documentacao_link: textOrNull(formData.get("documentacao_link")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("projetos")
    .update({
      nome: parsed.data.nome,
      tipo: parsed.data.tipo ?? null,
      status: parsed.data.status,
      escopo: parsed.data.escopo ?? null,
      tecnologias: parsed.data.tecnologias ?? null,
      links: parsed.data.links ?? null,
      repositorio_git: parsed.data.repositorio_git ?? null,
      deploy_url: parsed.data.deploy_url ?? null,
      documentacao_link: parsed.data.documentacao_link ?? null,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", projetoId);
  if (error) return { error: "Não foi possível atualizar o projeto." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteProjeto(clienteId: string, projetoId: string) {
  const { supabase } = await requireUser();
  await supabase.from("projetos").delete().eq("id", projetoId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Manutenções ----------

export async function createManutencao(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ManutencaoSchema.safeParse({
    projeto_id: textOrNull(formData.get("projeto_id")) ?? undefined,
    data: formData.get("data"),
    responsavel: textOrNull(formData.get("responsavel")) ?? undefined,
    tempo_gasto: textOrNull(formData.get("tempo_gasto")) ?? undefined,
    descricao: formData.get("descricao"),
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("manutencoes").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
    projeto_id: parsed.data.projeto_id ?? null,
    data: parsed.data.data,
    responsavel: parsed.data.responsavel ?? null,
    tempo_gasto: parsed.data.tempo_gasto ?? null,
    descricao: parsed.data.descricao,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) return { error: "Não foi possível salvar a manutenção." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateManutencao(
  clienteId: string,
  manutencaoId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ManutencaoSchema.safeParse({
    projeto_id: textOrNull(formData.get("projeto_id")) ?? undefined,
    data: formData.get("data"),
    responsavel: textOrNull(formData.get("responsavel")) ?? undefined,
    tempo_gasto: textOrNull(formData.get("tempo_gasto")) ?? undefined,
    descricao: formData.get("descricao"),
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("manutencoes")
    .update({
      projeto_id: parsed.data.projeto_id ?? null,
      data: parsed.data.data,
      responsavel: parsed.data.responsavel ?? null,
      tempo_gasto: parsed.data.tempo_gasto ?? null,
      descricao: parsed.data.descricao,
      observacoes: parsed.data.observacoes ?? null,
    })
    .eq("id", manutencaoId);
  if (error) return { error: "Não foi possível atualizar a manutenção." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteManutencao(
  clienteId: string,
  manutencaoId: string
) {
  const { supabase } = await requireUser();
  await supabase.from("manutencoes").delete().eq("id", manutencaoId);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------- Backups ----------

export async function createBackup(
  clienteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = BackupSchema.safeParse({
    projeto_id: textOrNull(formData.get("projeto_id")) ?? undefined,
    data: formData.get("data"),
    tipo: textOrNull(formData.get("tipo")) ?? undefined,
    local: textOrNull(formData.get("local")) ?? undefined,
    link_ou_arquivo: textOrNull(formData.get("link_ou_arquivo")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase, user, workspaceId } = await requireUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };
  if (!workspaceId) return SEM_EMPRESA;
  if (!(await clienteDaEmpresa(supabase, clienteId, workspaceId))) {
    return { error: "Cliente não encontrado nesta empresa." };
  }

  const { error } = await supabase.from("backups").insert({
    cliente_id: clienteId,
    user_id: user.id,
    workspace_id: workspaceId,
    projeto_id: parsed.data.projeto_id ?? null,
    data: parsed.data.data,
    tipo: parsed.data.tipo ?? null,
    local: parsed.data.local ?? null,
    link_ou_arquivo: parsed.data.link_ou_arquivo ?? null,
  });
  if (error) return { error: "Não foi possível salvar o backup." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function updateBackup(
  clienteId: string,
  backupId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = BackupSchema.safeParse({
    projeto_id: textOrNull(formData.get("projeto_id")) ?? undefined,
    data: formData.get("data"),
    tipo: textOrNull(formData.get("tipo")) ?? undefined,
    local: textOrNull(formData.get("local")) ?? undefined,
    link_ou_arquivo: textOrNull(formData.get("link_ou_arquivo")) ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("backups")
    .update({
      projeto_id: parsed.data.projeto_id ?? null,
      data: parsed.data.data,
      tipo: parsed.data.tipo ?? null,
      local: parsed.data.local ?? null,
      link_ou_arquivo: parsed.data.link_ou_arquivo ?? null,
    })
    .eq("id", backupId);
  if (error) return { error: "Não foi possível atualizar o backup." };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

export async function deleteBackup(clienteId: string, backupId: string) {
  const { supabase } = await requireUser();
  await supabase.from("backups").delete().eq("id", backupId);
  revalidatePath(`/clientes/${clienteId}`);
}
