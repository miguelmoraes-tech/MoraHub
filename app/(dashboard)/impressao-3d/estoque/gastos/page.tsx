import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { atalhosPeriodo, resolverPeriodo } from "@/lib/impressao-3d/painel";
import { lerGastosPorComprador } from "@/lib/impressao-3d/comprador";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { Aviso } from "@/components/impressao-3d/campos";
import { GastosPorPessoa } from "@/components/impressao-3d/gastos-por-pessoa";
import { SeletorPeriodo } from "@/components/impressao-3d/seletor-periodo";
import Link from "next/link";

const UM = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Atalho de "Gastos por pessoa" dentro do Estoque, para empresas SEM o módulo Relatórios. Só fundador/
 * cofundador (o extra "custos" de Relatórios não existe sem o módulo). Com Relatórios ligado, a tela
 * mora lá (aba "Gastos por pessoa").
 */
export default async function GastosPorPessoaPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const acesso = await getAcessoModulo("p3d_estoque");
  if (!acesso || !acesso.ehDono) redirect("/impressao-3d/estoque");
  if ((await getModulosHabilitados(acesso.workspaceId)).includes("p3d_relatorios")) {
    redirect("/impressao-3d/relatorios?aba=gastos");
  }
  const params = await searchParams;
  const { periodo, erro: erroPeriodo } = resolverPeriodo(UM(params.de), UM(params.ate));

  const r = await (await createClient()).rpc("p3d_gastos_por_comprador", {
    p_ws: acesso.workspaceId,
    p_de: periodo.de,
    p_ate: periodo.ate,
  });
  const erro = r.error ? mensagemRpc(r.error, "Não foi possível gerar os gastos por pessoa.") : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <Link href="/impressao-3d/estoque" className="mb-2 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← Estoque
        </Link>
        <h1 className="text-lg font-semibold text-zinc-100">Gastos por pessoa</h1>
        <p className="text-sm text-zinc-500">
          De {formatDataIso(periodo.de)} a {formatDataIso(periodo.ate)}.
        </p>
      </div>
      <SeletorPeriodo baseHref="/impressao-3d/estoque/gastos" periodo={periodo} atalhos={atalhosPeriodo()} erro={erroPeriodo} />
      {erro ? <Aviso tom="erro">{erro}</Aviso> : <GastosPorPessoa linhas={lerGastosPorComprador(r.data)} periodo={periodo} />}
    </div>
  );
}
