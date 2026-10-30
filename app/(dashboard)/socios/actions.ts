"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { exigeAprovacao } from "@/lib/aprovacoes";
import { getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import {
  lerCodigoGerado,
  sanearPermissoes,
  sociosErrorMessage,
  validadeValida,
  VALIDADE_MAX_HORAS,
  VALIDADE_MIN_HORAS,
  type PapelConvidavel,
} from "@/lib/socios-shared";
import type { PermissaoModulo } from "@/lib/modulos/permissoes";

// Tudo aqui é RPC SECURITY DEFINER (o RLS das tabelas é só de leitura). As
// actions só conferem que quem chama é fundador/cofundador da empresa ATIVA
// (vinda do servidor, nunca do cliente), validam a entrada e traduzem erros.

/**
 * `pendente: true` = a empresa tem 2+ fundadores: a alteração foi enviada para
 * aprovação e NADA mudou ainda (a tela avisa e relê o servidor; não há token,
 * id nem código para mostrar).
 */
export type ResultadoSocios<T = object> =
  | ({ ok: true; pendente?: false } & T)
  | { ok: true; pendente: true }
  | { error: string };

const ENVIADO = { ok: true, pendente: true } as const;

function aposEscrita(): void {
  revalidatePath("/socios");
  // O badge e a lista de aprovações também mudam quando algo fica pendente.
  revalidatePath("/aprovacoes");
}

/** Resposta de uma RPC void: imediata (1 fundador) ou pendente (2+). */
function concluido(pendente: boolean): ResultadoSocios {
  aposEscrita();
  return pendente ? ENVIADO : { ok: true };
}

const SEM_PAINEL = "Só o fundador e os cofundadores podem gerenciar a equipe.";

const PermissaoSchema = z.array(
  z.object({
    modulo: z.string().max(40),
    nivel: z.string().max(10),
    extras: z.array(z.string().max(40)).max(20).default([]),
  })
);

/**
 * Passa a entrada pelo schema, pela lista branca (módulo/nível válidos) e pelo
 * catálogo: módulo com `permite_membros = false` (RH, Vendedores) nunca é
 * gravado numa matriz, mesmo que o cliente o envie.
 */
async function lerPermissoes(bruto: unknown): Promise<PermissaoModulo[] | null> {
  const parsed = PermissaoSchema.safeParse(bruto);
  if (!parsed.success) return null;
  const permiteMembros = await getModulosPermiteMembros();
  return sanearPermissoes(parsed.data).filter((p) => permiteMembros.includes(p.modulo));
}

const ConviteSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }),
  // Cofundador não se convida por link: entra por código (gerarCodigoCofundador) e o fundador aprova.
  papel: z.enum(["socio", "funcionario"], { error: "Escolha o papel (sócio ou funcionário). Cofundador entra por código." }),
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
  const permissoes = await lerPermissoes(entrada.permissoes);
  if (!permissoes) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convidar_membro", {
    p_workspace_id: empresa.workspaceId,
    p_email: email,
    p_papel: papel,
    p_permissoes: permissoes,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  aposEscrita();
  // NULL = enviado para aprovação (2+ fundadores): ainda não há convite nem link.
  if (typeof data !== "string" || !data) return ENVIADO;
  return { ok: true, token: data };
}

export async function cancelarConvite(conviteId: string): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const pendente = await exigeAprovacao(supabase, empresa.workspaceId);
  const { error } = await supabase.rpc("cancelar_convite_empresa", { p_id: conviteId });
  if (error) return { error: sociosErrorMessage(error.message) };

  return concluido(pendente);
}

export async function atualizarPermissoesMembro(
  membroId: string,
  permissoes: PermissaoModulo[]
): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };
  const limpas = await lerPermissoes(permissoes);
  if (!limpas) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const pendente = await exigeAprovacao(supabase, empresa.workspaceId);
  const { error } = await supabase.rpc("atualizar_permissoes_membro", {
    p_workspace_id: empresa.workspaceId,
    p_membro_id: membroId,
    p_permissoes: limpas,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  return concluido(pendente);
}

export async function removerMembro(membroId: string): Promise<ResultadoSocios> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const pendente = await exigeAprovacao(supabase, empresa.workspaceId);
  const { error } = await supabase.rpc("remover_membro", {
    p_workspace_id: empresa.workspaceId,
    p_membro_id: membroId,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  return concluido(pendente);
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
  const permissoes = await lerPermissoes(entrada.permissoes);
  if (!permissoes) return { error: "Permissões inválidas." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("criar_perfil_acesso", {
    p_workspace_id: empresa.workspaceId,
    p_nome: validado.data.nome,
    p_descricao: validado.data.descricao || null,
    p_permissoes: permissoes,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  aposEscrita();
  // NULL = enviado para aprovação (2+ fundadores): o setor ainda não existe.
  if (typeof data !== "string" || !data) return ENVIADO;
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
    permissoes = await lerPermissoes(mudancas.permissoes);
    if (!permissoes) return { error: "Permissões inválidas." };
  }

  const supabase = await createClient();
  const pendente = await exigeAprovacao(supabase, empresa.workspaceId);
  const { error } = await supabase.rpc("atualizar_perfil_acesso", {
    p_id: id,
    p_nome: nome,
    p_descricao: descricao,
    p_permissoes: permissoes,
    p_ativo: mudancas.ativo ?? null,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  return concluido(pendente);
}

export async function regenerarCodigoSetor(id: string): Promise<ResultadoSocios<{ codigo: string }>> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerar_codigo_perfil_acesso", { p_id: id });
  if (error) return { error: sociosErrorMessage(error.message) };

  aposEscrita();
  // NULL = enviado para aprovação: o código novo só aparece depois (em Aprovações).
  if (typeof data !== "string" || !data) return ENVIADO;
  return { ok: true, codigo: data };
}

// --- Cofundador por código ---

/**
 * Gera o código de cofundador (RPC gerar_codigo_cofundador, validade de 1 a 168 h): invalida o anterior ainda
 * não usado e vale uma única vez. Quem digita o código usa solicitar_acesso; o pedido chega à tela de Equipe e
 * o fundador aprova (responder_solicitacao_acesso). Erros do banco aparecem como vieram (ex.: limite de
 * cofundadores ativos).
 */
export async function gerarCodigoCofundador(
  validadeHoras: number
): Promise<ResultadoSocios<{ codigo: string; expiraEm: string }>> {
  if (!validadeValida(validadeHoras)) {
    return { error: `Validade: escolha de ${VALIDADE_MIN_HORAS} a ${VALIDADE_MAX_HORAS} horas.` };
  }
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const { data, error } = await (await createClient()).rpc("gerar_codigo_cofundador", {
    p_ws: empresa.workspaceId,
    p_validade_horas: validadeHoras,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  const gerado = lerCodigoGerado(data);
  if (!gerado) return { error: "O banco não devolveu o código. Tente novamente." };
  aposEscrita();
  return { ok: true, ...gerado };
}

/** Cancela o código de cofundador ainda ativo (devolve quantos cancelou). */
export async function cancelarCodigoCofundador(): Promise<ResultadoSocios<{ cancelados: number }>> {
  const empresa = await getEmpresaPainel();
  if (!empresa) return { error: SEM_PAINEL };

  const { data, error } = await (await createClient()).rpc("cancelar_codigo_cofundador", {
    p_ws: empresa.workspaceId,
  });
  if (error) return { error: sociosErrorMessage(error.message) };

  aposEscrita();
  return { ok: true, cancelados: typeof data === "number" ? data : Number(data) || 0 };
}
