import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAcessoModulo } from "@/lib/empresa-ativa";
import { podeVerCustos } from "@/lib/impressao-3d/regras";
import { HOME_DONO } from "@/lib/modulos/registry";
import { getAbasVisiveis } from "@/lib/modulos/preferencias-servidor";
import { lerPainel, resolverPeriodo } from "@/lib/impressao-3d/painel";
import { mensagemRpc } from "@/lib/impressao-3d/erros";
import { DashboardBoard } from "@/components/impressao-3d/dashboard-board";

const UM = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Dashboard do nicho: um único retorno de p3d_painel (o banco calcula; a tela só mostra). */
export default async function DashboardNichoPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string | string[]; ate?: string | string[] }>;
}) {
  const acesso = await getAcessoModulo("p3d_dashboard");
  if (!acesso) redirect(HOME_DONO);
  const verCustos = podeVerCustos(acesso);
  const abas = await getAbasVisiveis("p3d_dashboard");
  const params = await searchParams;
  const { periodo, padrao, erro: erroPeriodo } = resolverPeriodo(UM(params.de), UM(params.ate));

  // Sem período na URL o banco assume o mês corrente em São Paulo; com período, valem as duas datas.
  const { data, error } = await (await createClient()).rpc("p3d_painel", {
    p_ws: acesso.workspaceId,
    ...(padrao ? {} : { p_de: periodo.de, p_ate: periodo.ate }),
  });
  const painel = error ? null : lerPainel(data, verCustos);

  // Link dos alertas: só para quem pode abrir o módulo de destino.
  const [estoque, impressoras, automacoes] = await Promise.all([
    getAcessoModulo("p3d_estoque"),
    getAcessoModulo("p3d_impressoras"),
    getAcessoModulo("p3d_automacoes"),
  ]);

  return (
    <DashboardBoard
      abas={abas}
      empresaId={acesso.workspaceId}
      painel={painel}
      periodoPedido={periodo}
      erroPeriodo={erroPeriodo}
      erro={error ? mensagemRpc(error, "Não foi possível carregar o painel.") : null}
      verCustos={verCustos}
      links={{ estoque: !!estoque, impressoras: !!impressoras, notificacoes: !!automacoes }}
    />
  );
}
