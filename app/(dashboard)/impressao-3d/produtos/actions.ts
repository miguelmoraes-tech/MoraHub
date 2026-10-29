"use server";

import { revalidatePath } from "next/cache";
import { getAcessoEdicao } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { mensagemEscrita } from "@/lib/impressao-3d/erros";
import { SEM_PERMISSAO } from "@/lib/impressao-3d/regras";
import { caminhoValido, LIMITE_BYTES } from "@/lib/impressao-3d/arquivos";
import { removerObjetos } from "@/lib/impressao-3d/storage";
import {
  ProdutoSchema,
  VariacaoSchema,
  formParaObjeto,
  primeiroErro,
} from "@/lib/impressao-3d/validacao";
import type { ActionState } from "@/lib/actions/types";

const MODULO = "p3d_produtos";
const ROTA = "/impressao-3d/produtos";

const TIPOS_ARQUIVO = ["stl", "3mf", "gcode", "foto", "outro"];

export async function criarProduto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = ProdutoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produtos")
    .insert({ workspace_id: acesso.workspaceId, ...parsed.data });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar o produto.") };

  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarProduto(
  produtoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = ProdutoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produtos")
    .update(parsed.data)
    .eq("id", produtoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar o produto.") };

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

export async function alternarProdutoAtivo(produtoId: string, ativo: boolean): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produtos")
    .update({ ativo })
    .eq("id", produtoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível alterar o produto.") };

  revalidatePath(ROTA);
  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

/** Remove os objetos do storage e depois o produto (as linhas filhas saem em cascata). */
export async function excluirProduto(produtoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: arquivos } = await supabase
    .from("p3d_produto_arquivos")
    .select("storage_path")
    .eq("produto_id", produtoId)
    .eq("workspace_id", acesso.workspaceId);
  const caminhos = ((arquivos ?? []) as { storage_path: string }[]).map((a) => a.storage_path);

  const { error } = await supabase
    .from("p3d_produtos")
    .delete()
    .eq("id", produtoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) {
    return {
      error: mensagemEscrita(error, "Não foi possível excluir o produto. Se ele está em orçamentos, arquive."),
    };
  }
  // O produto já saiu: o que sobrar no storage é só lixo órfão, sem acesso por nenhuma linha.
  await removerObjetos(caminhos);

  revalidatePath(ROTA);
  return { ok: true };
}

// --- Variações ----------------------------------------------------------------

export async function criarVariacao(
  produtoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = VariacaoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produto_variacoes")
    .insert({ workspace_id: acesso.workspaceId, produto_id: produtoId, ...parsed.data });
  if (error) return { error: mensagemEscrita(error, "Não foi possível salvar a variação.") };

  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

export async function atualizarVariacao(
  produtoId: string,
  variacaoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = VariacaoSchema.safeParse(formParaObjeto(formData));
  if (!parsed.success) return { error: primeiroErro(parsed.error) };

  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produto_variacoes")
    .update(parsed.data)
    .eq("id", variacaoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível atualizar a variação.") };

  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

export async function alternarVariacaoAtiva(
  produtoId: string,
  variacaoId: string,
  ativo: boolean
): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produto_variacoes")
    .update({ ativo })
    .eq("id", variacaoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível alterar a variação.") };

  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

export async function excluirVariacao(produtoId: string, variacaoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const { error } = await (await createClient())
    .from("p3d_produto_variacoes")
    .delete()
    .eq("id", variacaoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir a variação. Se ela está em orçamentos, arquive.") };

  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}

// --- Arquivos -----------------------------------------------------------------

export interface NovoArquivo {
  produtoId: string;
  variacaoId: string | null;
  tipo: string;
  nome: string;
  storagePath: string;
  tamanhoBytes: number;
  mimeType: string | null;
}

/**
 * Registra a linha de um arquivo que o navegador JÁ enviou ao bucket (o envio
 * passa por fora das server actions por causa do limite de 100 MB). Confere o
 * caminho "<workspace_id>/<produto_id>/..." contra a empresa ativa: caminho de
 * outra empresa é recusado. Se o registro falhar, a tela remove o objeto.
 */
export async function registrarArquivoProduto(entrada: NovoArquivo): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  if (!caminhoValido(entrada.storagePath, acesso.workspaceId, entrada.produtoId)) {
    return { error: "Caminho de arquivo inválido para esta empresa." };
  }
  if (!TIPOS_ARQUIVO.includes(entrada.tipo)) return { error: "Tipo de arquivo inválido." };
  if (!(entrada.tamanhoBytes >= 0) || entrada.tamanhoBytes > LIMITE_BYTES) {
    return { error: "O arquivo passa do limite de 100 MB." };
  }
  const nome = entrada.nome.trim().slice(0, 200);
  if (!nome) return { error: "Arquivo sem nome." };

  const supabase = await createClient();
  const { data: produto } = await supabase
    .from("p3d_produtos")
    .select("id")
    .eq("id", entrada.produtoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!produto) return { error: "Produto não encontrado." };

  const { error } = await supabase.from("p3d_produto_arquivos").insert({
    workspace_id: acesso.workspaceId,
    produto_id: entrada.produtoId,
    variacao_id: entrada.variacaoId,
    tipo: entrada.tipo,
    nome,
    storage_path: entrada.storagePath,
    tamanho_bytes: entrada.tamanhoBytes,
    mime_type: entrada.mimeType,
  });
  if (error) return { error: mensagemEscrita(error, "Não foi possível registrar o arquivo.") };

  revalidatePath(`${ROTA}/${entrada.produtoId}`);
  return { ok: true };
}

/** Remove o objeto do storage e, só então, a linha. */
export async function excluirArquivoProduto(produtoId: string, arquivoId: string): Promise<ActionState> {
  const acesso = await getAcessoEdicao(MODULO);
  if (!acesso) return { error: SEM_PERMISSAO };

  const supabase = await createClient();
  const { data: arquivo } = await supabase
    .from("p3d_produto_arquivos")
    .select("storage_path")
    .eq("id", arquivoId)
    .eq("workspace_id", acesso.workspaceId)
    .maybeSingle();
  if (!arquivo) return { error: "Arquivo não encontrado." };

  const removido = await removerObjetos([arquivo.storage_path as string]);
  if (removido.error) return { error: `Não foi possível remover o arquivo do armazenamento: ${removido.error}` };

  const { error } = await supabase
    .from("p3d_produto_arquivos")
    .delete()
    .eq("id", arquivoId)
    .eq("workspace_id", acesso.workspaceId);
  if (error) return { error: mensagemEscrita(error, "Não foi possível excluir o arquivo.") };

  revalidatePath(`${ROTA}/${produtoId}`);
  return { ok: true };
}
