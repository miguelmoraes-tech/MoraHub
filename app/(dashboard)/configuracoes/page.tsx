import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmpresaPainel } from "@/lib/empresa-ativa";
import { HOME_DONO, getModuloRegistro } from "@/lib/modulos/registry";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { createClient } from "@/lib/supabase/server";
import { getNichosDoCatalogo } from "@/lib/nichos";
import { getConfigEmpresa } from "@/lib/rotulos";
import { getFundadores } from "@/lib/aprovacoes";
import { FundadoresSection } from "@/components/empresa/fundadores-section";
import { RenomearEmpresaForm } from "@/components/empresa/renomear-empresa-form";
import { NichoModeloSection } from "@/components/empresa/nicho-modelo-section";
import { NomesTelasSection } from "@/components/empresa/nomes-telas-section";

/** Configurações da empresa ativa. Só o dono vê (confirmado no servidor). */
export default async function ConfiguracoesPage() {
  const empresa = await getEmpresaPainel();
  if (!empresa) redirect(HOME_DONO);

  const supabase = await createClient();
  const config = await getConfigEmpresa();
  const [nichos, habilitados, modelo, catalogo, fundadores] = await Promise.all([
    getNichosDoCatalogo(),
    getModulosHabilitados(empresa.workspaceId),
    config.modeloId
      ? supabase.from("modelos").select("chave").eq("id", config.modeloId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("modulos").select("chave, nome").order("ordem"),
    getFundadores(empresa.workspaceId),
  ]);

  // Só os módulos ligados têm nome de tela para editar, na ordem do catálogo.
  const modulos = ((catalogo.data ?? []) as { chave: string; nome: string }[])
    .filter((m) => habilitados.includes(m.chave) && getModuloRegistro(m.chave))
    .map((m) => ({ chave: m.chave, nome: m.nome }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Configurações da empresa</h1>
        <p className="text-sm text-zinc-500">Dados da empresa ativa.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <RenomearEmpresaForm nomeAtual={empresa.nome ?? ""} />
      </div>

      <Link
        href="/socios"
        className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
      >
        <p className="text-sm font-semibold text-zinc-100">Equipe e cofundadores</p>
        <p className="mt-1 text-xs text-zinc-500">
          Gere um código para adicionar cofundadores (eles digitam e você aprova), convide sócios e funcionários por link e escolha
          o que cada um acessa. Cofundador tem o mesmo poder do fundador.
        </p>
      </Link>

      <Link
        href="/acesso-vendedor"
        className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
      >
        <p className="text-sm font-semibold text-zinc-100">Entrar numa empresa com código</p>
        <p className="mt-1 text-xs text-zinc-500">
          Recebeu um código de cofundador, de setor ou de vendedor de outra empresa? Digite aqui. O responsável aprova o seu acesso e a
          empresa passa a aparecer no seletor de empresas.
        </p>
      </Link>

      <Link
        href="/configuracoes/navegacao"
        className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
      >
        <p className="text-sm font-semibold text-zinc-100">Personalizar navegação</p>
        <p className="mt-1 text-xs text-zinc-500">
          Ordem e itens do menu, abas das telas e o padrão da empresa. Só aparência: não muda módulos, permissões nem dados.
        </p>
      </Link>

      {habilitados.some((c) => c.startsWith("p3d_")) && (
        <Link
          href="/configuracoes/nicho"
          className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
        >
          <p className="text-sm font-semibold text-zinc-100">Configurações do nicho</p>
          <p className="mt-1 text-xs text-zinc-500">
            Precificação, alertas, integrações, módulos e equipe da Impressão 3D num só lugar.
          </p>
        </Link>
      )}

      <FundadoresSection fundadores={fundadores} meuId={empresa.userId} />

      <NichoModeloSection
        key={`${config.nichoChave}|${config.modeloId}`}
        nichos={nichos}
        nichoAtual={config.nichoChave}
        modeloAtual={(modelo.data as { chave: string } | null)?.chave ?? null}
      />

      <NomesTelasSection
        key={JSON.stringify(config.mapa)}
        modulos={modulos}
        atual={config.mapa}
        temNicho={!!config.nichoChave}
      />
    </div>
  );
}
