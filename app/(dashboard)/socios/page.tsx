import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { getRotulos } from "@/lib/rotulos";
import { getFundadores } from "@/lib/aprovacoes";
import { fraseDaRegra } from "@/lib/aprovacoes-shared";
import { getModulosHabilitados, getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import { HOME_DONO } from "@/lib/modulos/registry";
import {
  MODULO_ROTULO,
  extrasDoCatalogo,
  modulosOferecidos,
  paraConvites,
  codigoAtivo,
  montarPessoas,
  paraMembros,
  paraSetores,
  type ModuloPermissivel,
} from "@/lib/socios-shared";
import { ToastProvider } from "@/components/toast";
import { SociosBoard } from "@/components/socios/socios-board";

/**
 * Equipe da empresa: sócios, funcionários e cofundadores (com permissões por
 * módulo) e setores com código de entrada. Só fundador e cofundador abrem; o
 * RLS e as RPCs são a barreira de verdade. O formulário oferece apenas módulos
 * que a empresa tem ligados e que o catálogo marca como permite_membros.
 */
export default async function SociosPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);

  const supabase = await createClient();
  const ws = empresa.workspaceId;
  const rotulos = await getRotulos();

  const [habilitados, permiteMembros] = await Promise.all([
    getModulosHabilitados(ws),
    getModulosPermiteMembros(),
  ]);
  const chaves = modulosOferecidos(habilitados, permiteMembros);
  const agoraIso = new Date().toISOString();

  const [
    { data: catalogo },
    { data: membros },
    { data: convites },
    { data: setores },
    { data: codigoVendedor },
    fundadores,
    { data: codigos },
    { data: pedidosCofundador },
    { data: pessoasDaEmpresa },
  ] = await Promise.all([
    chaves.length
      ? supabase.from("modulos").select("chave, nome, permissoes_extras").in("chave", chaves)
      : Promise.resolve({ data: [] as never[] }),
    supabase.rpc("listar_membros_empresa", { p_workspace_id: ws }),
    supabase.rpc("listar_convites_empresa", { p_workspace_id: ws }),
    supabase
      .from("perfis_acesso")
      .select("id, workspace_id, nome, descricao, permissoes, codigo, ativo")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: true }),
    supabase.rpc("meu_codigo_vendedor", { p_workspace_id: ws }),
    getFundadores(ws),
    // Códigos de cofundador (somente leitura): o ativo é não usado, não cancelado e dentro da validade.
    supabase
      .from("workspace_codigos_cofundador")
      .select("id, codigo, expira_em, usado_em, cancelado_em")
      .eq("workspace_id", ws)
      .is("usado_em", null)
      .is("cancelado_em", null)
      .gt("expira_em", agoraIso)
      .order("expira_em", { ascending: false })
      .limit(5),
    // Pedidos feitos com código de cofundador, esperando a minha resposta.
    supabase
      .from("solicitacoes_vendedor")
      .select("id, email, created_at")
      .eq("workspace_id", ws)
      .eq("status", "pendente")
      .eq("papel_solicitado", "cofundador")
      .order("created_at", { ascending: true }),
    supabase.rpc("pessoas_da_empresa", { p_workspace_id: ws }),
  ]);
  const regra = fraseDaRegra(fundadores.length);

  const porChave = new Map(
    ((catalogo ?? []) as { chave: string; nome: string; permissoes_extras: unknown }[]).map((m) => [
      m.chave,
      m,
    ])
  );
  const modulos: ModuloPermissivel[] = chaves.map((chave) => ({
    chave,
    // Rótulo da empresa (nicho/modelo) tem preferência sobre o nome do catálogo.
    nome: rotulos.personalizado(chave)
      ? rotulos.plural(chave)
      : (porChave.get(chave)?.nome ?? MODULO_ROTULO[chave] ?? chave),
    extras: extrasDoCatalogo(porChave.get(chave)?.permissoes_extras),
  }));

  return (
    <ToastProvider>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-100">Equipe e cofundadores</h1>
          <p className="text-sm text-zinc-500">
            Adicione cofundadores por código, convide sócios e funcionários e escolha o que cada um vê e edita. Os setores dão um
            código para a pessoa pedir acesso sozinha.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            <strong className="text-zinc-300">Cofundador</strong> tem o mesmo poder do fundador.{" "}
            {regra ??
              "Com 2 ou mais fundadores, as alterações da empresa passam pela aprovação de todos em Aprovações. Hoje você é o único fundador: suas alterações valem na hora."}
          </p>
        </div>
        <SociosBoard
          modulos={modulos}
          membros={montarPessoas(
            fundadores,
            paraMembros(membros),
            ((pessoasDaEmpresa ?? []) as { pessoa_id: string; nome: string | null; papel: string }[])
          )}
          codigoCofundador={codigoAtivo((codigos ?? []) as Parameters<typeof codigoAtivo>[0], agoraIso)}
          pedidosCofundador={((pedidosCofundador ?? []) as { id: string; email: string | null; created_at: string }[]).map((p) => ({
            id: p.id,
            email: p.email,
            createdAt: p.created_at,
          }))}
          qtdFundadores={fundadores.length}
          convites={paraConvites(convites)}
          setores={paraSetores(setores)}
          codigoVendedor={typeof codigoVendedor === "string" ? codigoVendedor : null}
          userId={empresa.userId}
        />
      </div>
    </ToastProvider>
  );
}
