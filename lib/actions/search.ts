"use server";

import { createClient } from "@/lib/supabase/server";
import { getEffectiveWorkspaceIdGeral } from "@/lib/dono-efetivo";

export type BuscaResultado = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  href: string;
};

export type BuscaResposta = {
  clientes: { itens: BuscaResultado[]; total: number };
  acessos: { itens: BuscaResultado[]; total: number };
  infraestrutura: { itens: BuscaResultado[]; total: number };
  projetos: { itens: BuscaResultado[]; total: number };
  servicos: { itens: BuscaResultado[]; total: number };
  leads: { itens: BuscaResultado[]; total: number };
  documentos: { itens: BuscaResultado[]; total: number };
};

const LIMITE_POR_GRUPO = 5;

function vazio(): BuscaResposta {
  const grupo = { itens: [], total: 0 };
  return {
    clientes: grupo,
    acessos: { ...grupo },
    infraestrutura: { ...grupo },
    projetos: { ...grupo },
    servicos: { ...grupo },
    leads: { ...grupo },
    documentos: { ...grupo },
  };
}

/**
 * Escapes ILIKE wildcards and strips characters that would otherwise be
 * parsed as syntax by PostgREST's comma-separated `.or()` filter string.
 */
function sanitizeTermo(termo: string) {
  return termo.replace(/[,()]/g, " ").replace(/[%_]/g, "\\$&").trim();
}

export async function buscarGlobal(termoBruto: string): Promise<BuscaResposta> {
  const termo = termoBruto.trim();
  if (termo.length < 2) return vazio();

  const supabase = await createClient();
  const workspaceId = await getEffectiveWorkspaceIdGeral();
  const pattern = `%${sanitizeTermo(termo)}%`;
  const ate = LIMITE_POR_GRUPO + 1;

  const [
    { data: clientes },
    { data: acessos },
    { data: infraestrutura },
    { data: projetos },
    { data: servicos },
    { data: leads },
    { data: documentos },
  ] = await Promise.all([
    supabase
      .from("clientes")
      .select("id, nome, contato, email, responsavel, segmento")
      .eq("workspace_id", workspaceId ?? "")
      .or(
        `nome.ilike.${pattern},contato.ilike.${pattern},email.ilike.${pattern},responsavel.ilike.${pattern},segmento.ilike.${pattern}`
      )
      .order("nome")
      .limit(ate),
    supabase
      .from("acessos")
      .select("id, cliente_id, nome_servico, categoria, usuario, url_login")
      .or(
        `nome_servico.ilike.${pattern},categoria.ilike.${pattern},usuario.ilike.${pattern},url_login.ilike.${pattern}`
      )
      .limit(ate),
    supabase
      .from("infraestrutura")
      .select("id, cliente_id, dominio, hospedagem, tecnologias")
      .or(
        `dominio.ilike.${pattern},hospedagem.ilike.${pattern},tecnologias.ilike.${pattern}`
      )
      .limit(ate),
    supabase
      .from("projetos")
      .select("id, cliente_id, nome, tecnologias, repositorio_git")
      .or(
        `nome.ilike.${pattern},tecnologias.ilike.${pattern},repositorio_git.ilike.${pattern}`
      )
      .limit(ate),
    supabase
      .from("servicos")
      .select("id, cliente_id, nome, categoria")
      .or(`nome.ilike.${pattern},categoria.ilike.${pattern}`)
      .limit(ate),
    supabase
      .from("leads")
      .select("id, nome, nicho, contato")
      .eq("workspace_id", workspaceId ?? "")
      .or(`nome.ilike.${pattern},nicho.ilike.${pattern},contato.ilike.${pattern}`)
      .order("nome")
      .limit(ate),
    supabase
      .from("documentos")
      .select("id, cliente_id, titulo")
      .ilike("titulo", pattern)
      .limit(ate),
  ]);

  // Acessos/Infraestrutura/Projetos/Servicos/Documentos only carry
  // cliente_id — fetch display names for whichever clientes showed up
  // across those result sets in a single extra lookup.
  const clienteIdsRelacionados = new Set<string>();
  for (const row of [
    ...(acessos ?? []),
    ...(infraestrutura ?? []),
    ...(projetos ?? []),
    ...(servicos ?? []),
    ...(documentos ?? []),
  ]) {
    if (row.cliente_id) clienteIdsRelacionados.add(row.cliente_id);
  }

  const nomesPorClienteId = new Map<string, string>();
  if (clienteIdsRelacionados.size > 0) {
    const { data: clientesRelacionados } = await supabase
      .from("clientes")
      .select("id, nome")
      .in("id", [...clienteIdsRelacionados]);
    for (const c of clientesRelacionados ?? []) {
      nomesPorClienteId.set(c.id, c.nome);
    }
  }

  function corte<T>(rows: T[] | null) {
    const lista = rows ?? [];
    return { total: lista.length, itens: lista.slice(0, LIMITE_POR_GRUPO) };
  }

  const clientesCorte = corte(clientes);
  const acessosCorte = corte(acessos);
  const infraCorte = corte(infraestrutura);
  const projetosCorte = corte(projetos);
  const servicosCorte = corte(servicos);
  const leadsCorte = corte(leads);
  const documentosCorte = corte(documentos);

  return {
    clientes: {
      total: clientesCorte.total,
      itens: clientesCorte.itens.map((c) => ({
        id: c.id,
        titulo: c.nome,
        subtitulo: c.email ?? c.contato ?? c.segmento ?? null,
        href: `/clientes/${c.id}`,
      })),
    },
    acessos: {
      total: acessosCorte.total,
      itens: acessosCorte.itens.map((a) => ({
        id: a.id,
        titulo: a.nome_servico,
        subtitulo: nomesPorClienteId.get(a.cliente_id) ?? a.categoria ?? null,
        href: `/clientes/${a.cliente_id}#acessos`,
      })),
    },
    infraestrutura: {
      total: infraCorte.total,
      itens: infraCorte.itens.map((i) => ({
        id: i.id,
        titulo: i.dominio ?? i.hospedagem ?? "Infraestrutura",
        subtitulo: nomesPorClienteId.get(i.cliente_id) ?? null,
        href: `/clientes/${i.cliente_id}#infraestrutura`,
      })),
    },
    projetos: {
      total: projetosCorte.total,
      itens: projetosCorte.itens.map((p) => ({
        id: p.id,
        titulo: p.nome,
        subtitulo: nomesPorClienteId.get(p.cliente_id) ?? null,
        href: `/clientes/${p.cliente_id}#projetos`,
      })),
    },
    servicos: {
      total: servicosCorte.total,
      itens: servicosCorte.itens.map((s) => ({
        id: s.id,
        titulo: s.nome,
        subtitulo: nomesPorClienteId.get(s.cliente_id) ?? s.categoria ?? null,
        href: `/clientes/${s.cliente_id}#servicos`,
      })),
    },
    leads: {
      total: leadsCorte.total,
      itens: leadsCorte.itens.map((l) => ({
        id: l.id,
        titulo: l.nome,
        subtitulo: l.nicho ?? l.contato ?? null,
        href: `/leads?lead=${l.id}`,
      })),
    },
    documentos: {
      total: documentosCorte.total,
      itens: documentosCorte.itens.map((d) => ({
        id: d.id,
        titulo: d.titulo,
        subtitulo: d.cliente_id
          ? (nomesPorClienteId.get(d.cliente_id) ?? null)
          : "Documento geral",
        href: `/documentos#documento-${d.id}`,
      })),
    },
  };
}
