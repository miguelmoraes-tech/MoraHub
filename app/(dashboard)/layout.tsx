import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { VencimentosBanner } from "@/components/vencimentos-banner";
import { WelcomeBanner } from "@/components/welcome-banner";
import { PageTransition } from "@/components/page-transition";
import { getVencimentoAlertas } from "@/lib/vencimentos/get-alerts";
import { getFinanceiroDonoId } from "@/lib/financeiro";
import { getRHDonoId } from "@/lib/rh";
import { getComercialDonoId } from "@/lib/comercial";
import { getMarketingDonoId } from "@/lib/marketing";
import { getUnreadTotal } from "@/lib/chat";
import type { AccountType } from "@/lib/hub-mode";
import { isRotaHabilitada } from "@/lib/modulos-habilitados";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { ToastProvider } from "@/components/toast";
import {
  SolicitacoesVendedorProvider,
  type SolicitacaoPendente,
} from "@/components/vendedor/solicitacoes-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Vencimentos e Chat são módulos desligados (lib/modulos-habilitados.ts):
  // sem banner, sem contador de não lidas e sem as consultas deles.
  const vencimentosAtivo = isRotaHabilitada("/calendario");
  const alertas = vencimentosAtivo ? await getVencimentoAlertas() : [];
  const financeiroDonoId = await getFinanceiroDonoId();
  const restritoFinanceiro = !!financeiroDonoId;
  const rhDonoId = await getRHDonoId();
  // A person could in principle hold both an active financeiro and an
  // active rh link (different companies, or even the same one) — Financeiro
  // wins the restricted-sidebar view in that edge case, same as before RH
  // existed; nothing about their actual data access depends on this choice.
  const restritoRH = !!rhDonoId && !restritoFinanceiro;
  const comercialDonoId = await getComercialDonoId();
  const restritoComercial = !!comercialDonoId && !restritoFinanceiro && !restritoRH;
  const marketingDonoId = await getMarketingDonoId();
  const restritoMarketing =
    !!marketingDonoId && !restritoFinanceiro && !restritoRH && !restritoComercial;

  const { data: colaboracao } = await supabase
    .from("membros")
    .select("id")
    .eq("membro_id", user.id)
    .eq("status", "ativo")
    .limit(1)
    .maybeSingle();

  const { data: tiposAtivosRows } = await supabase
    .from("perfis_tipos_ativos")
    .select("tipo")
    .eq("user_id", user.id);
  const tiposAtivos = (tiposAtivosRows ?? []).map((r) => r.tipo as AccountType);

  let chatHref = "/juridico";
  if (restritoFinanceiro && financeiroDonoId) {
    const { data: conversaFinanceiro } = await supabase
      .from("conversas")
      .select("id")
      .eq("dono_id", financeiroDonoId)
      .eq("membro_id", user.id)
      .eq("papel", "financeiro")
      .maybeSingle();
    if (conversaFinanceiro) chatHref = `/chat/${conversaFinanceiro.id}`;
  } else if (restritoRH && rhDonoId) {
    const { data: conversaRH } = await supabase
      .from("conversas")
      .select("id")
      .eq("dono_id", rhDonoId)
      .eq("membro_id", user.id)
      .eq("papel", "rh")
      .maybeSingle();
    if (conversaRH) chatHref = `/chat/${conversaRH.id}`;
  } else if (restritoComercial && comercialDonoId) {
    const { data: conversaComercial } = await supabase
      .from("conversas")
      .select("id")
      .eq("dono_id", comercialDonoId)
      .eq("membro_id", user.id)
      .eq("papel", "comercial")
      .maybeSingle();
    if (conversaComercial) chatHref = `/chat/${conversaComercial.id}`;
  } else if (restritoMarketing && marketingDonoId) {
    const { data: conversaMarketing } = await supabase
      .from("conversas")
      .select("id")
      .eq("dono_id", marketingDonoId)
      .eq("membro_id", user.id)
      .eq("papel", "marketing")
      .maybeSingle();
    if (conversaMarketing) chatHref = `/chat/${conversaMarketing.id}`;
  }
  const unreadTotal = isRotaHabilitada("/chat") ? await getUnreadTotal() : 0;

  // Pedidos de acesso de vendedor: só o dono do workspace empresarial os vê
  // (RLS) — quem está numa visão restrita de colaborador não tem sino.
  const donoEmpresarial =
    tiposAtivos.includes("empresarial") &&
    !restritoFinanceiro &&
    !restritoRH &&
    !restritoComercial &&
    !restritoMarketing;
  const workspaceEmpresarialId = donoEmpresarial
    ? await getWorkspaceIdPadrao(user.id, "empresarial")
    : null;
  let solicitacoesPendentes: SolicitacaoPendente[] = [];
  if (workspaceEmpresarialId) {
    const { data } = await supabase
      .from("solicitacoes_vendedor")
      .select("id, email, created_at")
      .eq("workspace_id", workspaceEmpresarialId)
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    solicitacoesPendentes = (data ?? []) as SolicitacaoPendente[];
  }

  const conteudo = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        userId={user.id}
        temColaboracoes={
          !!colaboracao &&
          !restritoFinanceiro &&
          !restritoRH &&
          !restritoComercial &&
          !restritoMarketing
        }
        tiposAtivos={tiposAtivos}
        restritoFinanceiro={restritoFinanceiro}
        restritoRH={restritoRH}
        restritoComercial={restritoComercial}
        restritoMarketing={restritoMarketing}
        chatHref={chatHref}
        unreadTotal={unreadTotal}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {vencimentosAtivo && <VencimentosBanner alertas={alertas} />}
        <WelcomeBanner />
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );

  return (
    <ToastProvider>
      {workspaceEmpresarialId ? (
        <SolicitacoesVendedorProvider
          workspaceId={workspaceEmpresarialId}
          initialPendentes={solicitacoesPendentes}
        >
          {conteudo}
        </SolicitacoesVendedorProvider>
      ) : (
        conteudo
      )}
    </ToastProvider>
  );
}
