"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import {
  sanearPermissoes,
  sociosErrorMessage,
  type PapelConvidavel,
} from "@/lib/socios-shared";
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

// Tudo aqui é RPC SECURITY DEFINER (o RLS das tabelas é só de leitura). As
// actions só conferem que quem chama é fundador/cofundador da empresa ATIVA
// (vinda do servidor, nunca do cliente), validam a entrada e traduzem erros.

export type ResultadoSocios<T = object> = ({ ok: true } & T) | { error: string };

const SEM_PAINEL = "Só o fundador e os cofundadores podem gerenciar a equipe.";

const PermissaoSchema = z.array(
  z.object({
    modulo: z.string().max(40),
    nivel: z.string().max(10),
    extras: z.array(z.string().max(40)).max(20).default([]),
  })
);

/** Passa a entrada pelo schema e depois pela lista branca (módulo/nível válidos). */
function lerPermissoes(bruto: unknown): PermissaoModulo[] | null {
  const parsed = PermissaoSchema.safeParse(bruto);
  return parsed.success ? sanearPermissoes(parsed.data) : null;
}

const ConviteSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  papel: z.enum(["socio", "funcionario", "cofundador"], { error: "Escolha o papel." }),
});

export async function convidarMembro(entrada: {
  email: string;
  papel: PapelConvidavel;
  permissoes: PermissaoModulo[];
}): Promise<ResultadoSocios<{ token: string }>> {
  const validado = ConviteSchema.safeParse({
    email: String(entrada.email ?? "").trim(),
    papel: entrada.papel,
  });
  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { email, papel } = validado.data;

  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };
  // Só o fundador convida cofundador (a RPC confere de novo).
  if (papel === "cofundador" && empresa.papel !== "dono") {
    return { error: "Só o fundador pode convidar um cofundador." };
  }

  // Cofundador tem o mesmo nível do fundador: não leva matriz.
  const permissoes = papel === "cofundador" ? [] : lerPermissoes(entrada.permissoes);
  if (!permissoes) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convidar_membro", {
    p_workspace_id: empresa.workspaceId,
    p_email: email,
    p_papel: papel,
    p_permissoes: permissoes,
  });
  if (error || typeof data !== "string" || !data) {
    return { error: sociosErrorMessage(error?.message) };
  }

  revalidatePath("/socios");
  return { ok: true, token: data };
}

export async function cancelarConvite(conviteId: string): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_convite_empresa", { p_id: conviteId });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/socios");
  return { ok: true };
}

export async function atualizarPermissoesMembro(
  membroId: string,
  permissoes: PermissaoModulo[]
): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };
  const limpas = lerPermissoes(permissoes);
  if (!limpas) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_permissoes_membro", {
    p_workspace_id: empresa.workspaceId,
    p_membro_id: membroId,
    p_permissoes: limpas,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/socios");
  return { ok: true };
}

export async function removerMembro(membroId: string): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const { error } = await supabase.rpc("remover_membro", {
    p_workspace_id: empresa.workspaceId,
    p_membro_id: membroId,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/socios");
  return { ok: true };
}

// --- Setores (perfis_acesso) ---

const SetorSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { error: "O nome do setor deve ter entre 2 e 60 caracteres." })
    .max(60, { error: "O nome do setor deve ter entre 2 e 60 caracteres." }),
  descricao: z.string().trim().max(300, { error: "A descrição é longa demais." }).optional(),
});

export async function criarSetor(entrada: {
  nome: string;
  descricao: string;
  permissoes: PermissaoModulo[];
}): Promise<ResultadoSocios<{ id: string }>> {
  const validado = SetorSchema.safeParse({
    nome: entrada.nome,
    descricao: entrada.descricao,
  });
  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };
  const permissoes = lerPermissoes(entrada.permissoes);
  if (!permissoes) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_perfil_acesso", {
    p_workspace_id: empresa.workspaceId,
    p_nome: validado.data.nome,
    p_descricao: validado.data.descricao || null,
    p_permissoes: permissoes,
  });
  if (error || typeof data !== "string") return { error: sociosErrorMessage(error?.message) };

  revalidatePath("/socios");
  return { ok: true, id: data };
}

/**
 * Atualiza um setor. Campo ausente = não muda (a RPC trata parâmetro nulo
 * assim). Mudar as permissões de um setor NÃO altera quem já entrou: essas
 * pessoas se editam na aba Equipe.
 */
export async function atualizarSetor(
  id: string,
  mudancas: {
    nome?: string;
    descricao?: string;
    permissoes?: PermissaoModulo[];
    ativo?: boolean;
  }
): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  let nome: string | null = null;
  if (mudancas.nome !== undefined) {
    const v = SetorSchema.shape.nome.safeParse(mudancas.nome);
    if (!v.success) return { error: v.error.issues[0]?.message ?? "Nome inválido." };
    nome = v.data;
  }
  let descricao: string | null = null;
  if (mudancas.descricao !== undefined) {
    const v = SetorSchema.shape.descricao.safeParse(mudancas.descricao);
    if (!v.success) return { error: v.error.issues[0]?.message ?? "Descrição inválida." };
    descricao = v.data ?? null;
  }
  let permissoes: PermissaoModulo[] | null = null;
  if (mudancas.permissoes !== undefined) {
    permissoes = lerPermissoes(mudancas.permissoes);
    if (!permissoes) return { error: "Permissões inválidas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_perfil_acesso", {
    p_id: id,
    p_nome: nome,
    p_descricao: descricao,
    p_permissoes: permissoes,
    p_ativo: mudancas.ativo ?? null,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  revalidatePath("/socios");
  return { ok: true };
}

export async function regenerarCodigoSetor(id: string): Promise<ResultadoSocios<{ codigo: string }>> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerar_codigo_perfil_acesso", { p_id: id });
  if (error || typeof data !== "string") return { error: sociosErrorMessage(error?.message) };

  revalidatePath("/socios");
  return { ok: true, codigo: data };
}
