import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { HOME_DONO } from "@/lib/modulos/registry";
import {
  ABAS_RELATORIO, LIMITES_PRODUTOS, agrupamentoValido, lerRelatorioProdutividade, lerRelatorioProdutos,
  lerRelatorioVendas, resolverPeriodo,
  type AbaRelatorio, type LinhaProdutividade, type LinhaProduto, type LinhaVendas,
} from "@/lib/impressao-3d/painel";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { RelatoriosBoard } from "@/components/impressao-3d/relatorios-board";

const UM = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Relatórios do nicho: uma RPC por aba (o banco agrega); período máximo de 366 dias. */
export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; de?: string; ate?: string; agrupar?: string; limite?: string }>;
}) {
  const acesso = await getAcessoModulo("p3d_relatorios");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);
  const params = await searchParams;
  const aba: AbaRelatorio = ABAS_RELATORIO.find((a) => a === UM(params.aba)) ?? "vendas";
  const agrupar = agrupamentoValido(UM(params.agrupar));
  const limitePedido = Number(UM(params.limite));
  const limite = LIMITES_PRODUTOS.includes(limitePedido) ? limitePedido : 20;
  // Os relatórios exigem as duas datas: sem período na URL, vale o mês corrente em São Paulo.
  const { periodo, erro: erroPeriodo } = resolverPeriodo(UM(params.de), UM(params.ate));

  const supabase = await createClient();
  const ws = acesso.workspaceId;
  const base = { p_ws: ws, p_de: periodo.de, p_ate: periodo.ate };

  let vendas: LinhaVendas[] = [];
  let produtos: LinhaProduto[] = [];
  let produtividade: LinhaProdutividade[] = [];
  let erro: string | null = null;

  if (aba === "vendas") {
    const r = await supabase.rpc("p3d_relatorio_vendas", { ...base, p_agrupar: agrupar });
    if (r.error) erro = mensagemRpc(r.error, "Não foi possível gerar o relatório de vendas.");
    else vendas = lerRelatorioVendas(r.data, verCustos);
  } else if (aba === "produtos") {
    const r = await supabase.rpc("p3d_relatorio_produtos", { ...base, p_limite: limite });
    if (r.error) erro = mensagemRpc(r.error, "Não foi possível gerar o relatório de produtos.");
    else produtos = lerRelatorioProdutos(r.data, verCustos);
  } else {
    const r = await supabase.rpc("p3d_relatorio_produtividade", base);
    if (r.error) erro = mensagemRpc(r.error, "Não foi possível gerar o relatório de produtividade.");
    else produtividade = lerRelatorioProdutividade(r.data, verCustos);
  }

  return (
    <RelatoriosBoard
      aba={aba}
      periodo={periodo}
      erroPeriodo={erroPeriodo}
      agrupar={agrupar}
      limite={limite}
      verCustos={verCustos}
      erro={erro}
      vendas={vendas}
      produtos={produtos}
      produtividade={produtividade}
    />
  );
}
