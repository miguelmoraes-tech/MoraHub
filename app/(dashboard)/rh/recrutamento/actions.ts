"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { erroValorSemPermissao, podeVerSalarios } from "@/lib/rh/salarios";
import {
  uploadCandidatoCurriculo,
  removeClienteArquivo,
} from "@/lib/supabase/storage";
import { VagaSchema } from "@/lib/validations/vaga";
import { CandidatoSchema } from "@/lib/validations/candidato";
import type { ActionState } from "@/lib/actions/types";
import type { CandidatoStatus, Vaga } from "@/lib/types";

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

function revalidateRecrutamento(vagaId?: string) {
  revalidatePath("/rh/recrutamento");
  if (vagaId) revalidatePath(`/rh/recrutamento/${vagaId}`);
  revalidatePath("/rh");
}

function parseVagaForm(formData: FormData) {
  return VagaSchema.safeParse({
    titulo: formData.get("titulo"),
    departamento_id: textOrNull(formData.get("departamento_id")) ?? undefined,
    status: formData.get("status") ?? "aberta",
    descricao: textOrNull(formData.get("descricao")) ?? undefined,
    requisitos: textOrNull(formData.get("requisitos")) ?? undefined,
    salario_previsto: textOrNull(formData.get("salario_previsto")) ?? undefined,
    tipo_contrato: formData.get("tipo_contrato") ?? "clt",
  });
}

export async function createVaga(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseVagaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };
  // Salário previsto é do extra "salarios" (só de tela: ver lib/rh/salarios.ts).
  const erroSalario = erroValorSemPermissao(acesso, parsed.data.salario_previsto);
  if (erroSalario) return { error: erroSalario };

  const supabase = await createClient();
  const { error } = await supabase.from("vagas").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    titulo: parsed.data.titulo,
    departamento_id: parsed.data.departamento_id ?? null,
    status: parsed.data.status,
    descricao: parsed.data.descricao ?? null,
    requisitos: parsed.data.requisitos ?? null,
    salario_previsto: parsed.data.salario_previsto ?? null,
    tipo_contrato: parsed.data.tipo_contrato,
  });
  if (error) return { error: "Não foi possível salvar a vaga." };

  revalidateRecrutamento();
  return { ok: true };
}

export async function updateVaga(
  vagaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseVagaForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };
  const erroSalario = erroValorSemPermissao(acesso, parsed.data.salario_previsto);
  if (erroSalario) return { error: erroSalario };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vagas")
    .update({
      titulo: parsed.data.titulo,
      departamento_id: parsed.data.departamento_id ?? null,
      status: parsed.data.status,
      descricao: parsed.data.descricao ?? null,
      requisitos: parsed.data.requisitos ?? null,
      // Sem o extra, o salário previsto gravado não é tocado.
      ...(podeVerSalarios(acesso) ? { salario_previsto: parsed.data.salario_previsto ?? null } : {}),
      tipo_contrato: parsed.data.tipo_contrato,
    })
    .eq("id", vagaId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar a vaga." };

  revalidateRecrutamento(vagaId);
  return { ok: true };
}

export async function deleteVaga(vagaId: string) {
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("vagas")
    .delete()
    .eq("id", vagaId)
    .eq("workspace_id", acesso.workspaceId);
  revalidateRecrutamento();
}

function parseCandidatoForm(formData: FormData) {
  return CandidatoSchema.safeParse({
    vaga_id: formData.get("vaga_id"),
    nome: formData.get("nome"),
    email: textOrNull(formData.get("email")) ?? undefined,
    telefone: textOrNull(formData.get("telefone")) ?? undefined,
    status: formData.get("status") ?? "triagem",
    origem: textOrNull(formData.get("origem")) ?? undefined,
    observacoes: textOrNull(formData.get("observacoes")) ?? undefined,
  });
}

export async function createCandidato(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseCandidatoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // RH por pessoa: exige permissão de edição.
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();

  const curriculo = fileOrNull(formData.get("curriculo"));
  let curriculo_path: string | null = null;
  if (curriculo) {
    try {
      curriculo_path = await uploadCandidatoCurriculo(acesso.workspaceId, curriculo);
    } catch {
      return { error: "Não foi possível enviar o currículo." };
    }
  }

  const { error } = await supabase.from("candidatos").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    vaga_id: parsed.data.vaga_id,
    nome: parsed.data.nome,
    email: parsed.data.email ?? null,
    telefone: parsed.data.telefone ?? null,
    status: parsed.data.status,
    curriculo_path,
    origem: parsed.data.origem ?? null,
    observacoes: parsed.data.observacoes ?? null,
  });
  if (error) {
    if (curriculo_path) await removeClienteArquivo(curriculo_path);
    return { error: "Não foi possível salvar o candidato." };
  }

  revalidateRecrutamento(parsed.data.vaga_id);
  return { ok: true };
}

export async function updateCandidato(
  candidatoId: string,
  vagaId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseCandidatoForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("candidatos")
    .update({
      nome: parsed.data.nome,
      email: parsed.data.email ?? null,
      telefone: parsed.data.telefone ?? null,
      status: parsed.data.status,
      origem: parsed.data.origem ?? null,
      observacoes: parsed.data.observacoes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidatoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: "Não foi possível atualizar o candidato." };

  revalidateRecrutamento(vagaId);
  return { ok: true };
}

export async function moveCandidato(candidatoId: string, vagaId: string, status: CandidatoStatus) {
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return;

  const supabase = await createClient();
  await supabase
    .from("candidatos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", candidatoId)
    .eq("workspace_id", acesso.workspaceId);
  revalidateRecrutamento(vagaId);
}

export async function deleteCandidato(candidatoId: string, vagaId: string) {
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return;

  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("candidatos")
    .select("curriculo_path")
    .eq("id", candidatoId)
    .eq("workspace_id", acesso.workspaceId)
    .single();

  await supabase
    .from("candidatos")
    .delete()
    .eq("id", candidatoId)
    .eq("workspace_id", acesso.workspaceId);

  const curriculoPath = (existente as { curriculo_path: string | null } | null)?.curriculo_path;
  if (curriculoPath) await removeClienteArquivo(curriculoPath);

  revalidateRecrutamento(vagaId);
}

export async function contratarCandidato(
  candidatoId: string,
  vagaId: string
): Promise<ActionState> {
  // RH por pessoa: exige permissão de edição.
  const acesso = await getAcessoEdicao("rh");
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: candidato } = await supabase
    .from("candidatos")
    .select("nome, email, telefone")
    .eq("id", candidatoId)
    .eq("workspace_id", acesso.workspaceId)
    .single();
  if (!candidato) return { error: "Candidato não encontrado." };

  const { data: vaga } = await supabase
    .from("vagas")
    .select("departamento_id, tipo_contrato, salario_previsto")
    .eq("id", vagaId)
    .eq("workspace_id", acesso.workspaceId)
    .single();

  const c = candidato as { nome: string; email: string | null; telefone: string | null };
  const v = vaga as Pick<Vaga, "departamento_id" | "tipo_contrato" | "salario_previsto"> | null;

  const { error } = await supabase.from("funcionarios").insert({
    user_id: acesso.donoId,
    workspace_id: acesso.workspaceId,
    nome: c.nome,
    email: c.email,
    telefone: c.telefone,
    departamento_id: v?.departamento_id ?? null,
    tipo_contrato: v?.tipo_contrato ?? "clt",
    salario: v?.salario_previsto ?? null,
    status: "ativo",
  });
  if (error) return { error: "Não foi possível criar o funcionário." };

  revalidatePath("/rh/funcionarios");
  revalidateRecrutamento(vagaId);
  return { ok: true };
}
