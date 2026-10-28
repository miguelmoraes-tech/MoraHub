"use server";

import { revalidatePath } from "next/cache";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { getConfigEmpresa } from "@/lib/rotulos";
import { erroDeNicho } from "@/lib/nichos-shared";
import {
  mesclarRotulos,
  ordemParaLigar,
  validarRotulo,
  type ModuloDoCatalogo,
  type RotuloModulo,
} from "@/lib/rotulos-shared";
import { getModuloRegistro } from "@/lib/modulos/registry";
import type { ActionState } from "@/lib/actions/types";

/**
 * Nicho, modelo e nomes das telas da empresa ativa. Só dono/cofundador: a
 * empresa vem do servidor (getEmpresaPainel) e o banco confere de novo dentro
 * das RPCs (aplicar_nicho, salvar_rotulos). Não há escrita direta em
 * workspace_config.
 */

type Resultado = NonNullable<ActionState>;

async function empresaDoPainel() {
  const empresa = await getEmpresaPainel();
  return empresa ? { workspaceId: empresa.workspaceId, supabase: await createClient() } : null;
}

function concluir(): Resultado {
  // Menu, títulos e módulos ligados dependem da configuração da empresa.
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Troca o nicho (e o modelo, opcional): liga os recomendados e grava os nomes do nicho+modelo. */
export async function aplicarNichoDaEmpresa(
  nicho: string,
  modelo: string | null
): Promise<Resultado> {
  const ctx = await empresaDoPainel();
  if (!ctx) return { error: "Só o dono ou cofundador da empresa pode fazer isso." };
  if (!nicho) return { error: "Escolha um tipo de negócio." };

  const { error } = await ctx.supabase.rpc("aplicar_nicho", {
    p_workspace_id: ctx.workspaceId,
    p_nicho: nicho,
    p_modelo: modelo || null,
  });
  if (error) return { error: erroDeNicho(error.message) };
  return concluir();
}

/**
 * Salva os nomes das telas. O cliente manda só o que editou; aqui se mescla com
 * o que está gravado e se envia o mapa COMPLETO, porque salvar_rotulos
 * substitui o conjunto inteiro.
 */
export async function salvarNomesDasTelas(
  edicoes: Record<string, RotuloModulo>
): Promise<Resultado> {
  const ctx = await empresaDoPainel();
  if (!ctx) return { error: "Só o dono ou cofundador da empresa pode fazer isso." };

  for (const [modulo, rotulo] of Object.entries(edicoes)) {
    if (!getModuloRegistro(modulo)) return { error: "Módulo desconhecido." };
    const invalido = validarRotulo(rotulo);
    if (invalido) return { error: invalido };
  }

  const atual = (await getConfigEmpresa()).mapa;
  const { error } = await ctx.supabase.rpc("salvar_rotulos", {
    p_workspace_id: ctx.workspaceId,
    p_rotulos: mesclarRotulos(atual, edicoes),
  });
  if (error) return { error: erroDeNicho(error.message) };
  return concluir();
}

/**
 * "Restaurar padrão do nicho": reaplica o nicho (e o modelo) atual, que
 * sobrescreve os nomes pelos do nicho+modelo. Sem nicho, volta aos nomes do app
 * (conjunto vazio em salvar_rotulos).
 */
export async function restaurarPadraoDoNicho(): Promise<Resultado> {
  const ctx = await empresaDoPainel();
  if (!ctx) return { error: "Só o dono ou cofundador da empresa pode fazer isso." };

  const config = await getConfigEmpresa();
  if (!config.nichoChave) {
    const { error } = await ctx.supabase.rpc("salvar_rotulos", {
      p_workspace_id: ctx.workspaceId,
      p_rotulos: {},
    });
    if (error) return { error: erroDeNicho(error.message) };
    return concluir();
  }

  let modeloChave: string | null = null;
  if (config.modeloId) {
    const { data } = await ctx.supabase
      .from("modelos")
      .select("chave")
      .eq("id", config.modeloId)
      .maybeSingle();
    modeloChave = (data as { chave: string } | null)?.chave ?? null;
  }
  return aplicarNichoDaEmpresa(config.nichoChave, modeloChave);
}

/**
 * "Adicionar recomendados": liga, um a um (definir_modulo valida as
 * dependências), os módulos do nicho que ainda não estão ligados. NÃO usa
 * aplicar_nicho: ele também trocaria os nomes das telas, e aqui só se ligam
 * módulos.
 */
export async function adicionarRecomendados(): Promise<Resultado> {
  const ctx = await empresaDoPainel();
  if (!ctx) return { error: "Só o dono ou cofundador da empresa pode fazer isso." };

  const nicho = (await getConfigEmpresa()).nichoChave;
  if (!nicho) return { error: "A empresa ainda não tem um tipo de negócio definido." };

  const [recomendados, catalogo, ligados] = await Promise.all([
    ctx.supabase
      .from("nicho_modulos")
      .select("modulo_chave")
      .eq("nicho_chave", nicho)
      .eq("recomendado", true),
    ctx.supabase.from("modulos").select("chave, ativo, depende_de"),
    ctx.supabase
      .from("workspace_modulos")
      .select("modulo_chave")
      .eq("workspace_id", ctx.workspaceId)
      .eq("habilitado", true),
  ]);
  if (recomendados.error || catalogo.error || ligados.error) {
    return { error: "Não foi possível carregar os módulos. Tente novamente." };
  }

  const modulos: ModuloDoCatalogo[] = (
    (catalogo.data ?? []) as { chave: string; ativo: boolean; depende_de: string[] | null }[]
  ).map((m) => ({ chave: m.chave, ativo: m.ativo, dependeDe: m.depende_de ?? [] }));
  const ordem = ordemParaLigar(
    ((recomendados.data ?? []) as { modulo_chave: string }[]).map((r) => r.modulo_chave),
    modulos,
    ((ligados.data ?? []) as { modulo_chave: string }[]).map((l) => l.modulo_chave)
  );

  for (const chave of ordem) {
    const { error } = await ctx.supabase.rpc("definir_modulo", {
      p_workspace_id: ctx.workspaceId,
      p_chave: chave,
      p_habilitado: true,
    });
    if (error) {
      revalidatePath("/", "layout");
      return {
        error:
          error.code === "P0001" && error.message
            ? error.message
            : "Não foi possível adicionar todos os módulos. Tente novamente.",
      };
    }
  }
  return concluir();
}
