import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { VencimentosBanner } from "@/components/vencimentos-banner";
import { WelcomeBanner } from "@/components/welcome-banner";
import { PageTransition } from "@/components/page-transition";
import { getVencimentoAlertas } from "@/lib/vencimentos/get-alerts";
import { getUnreadTotal } from "@/lib/chat";
import type { AccountType } from "@/lib/hub-mode";
import { CHAT_HABILITADO, VENCIMENTOS_HABILITADO } from "@/lib/modulos/registry";
import { getModulosHabilitados } from "@/lib/modulos/habilitados";
import { getEmpresaAtiva, getEmpresasDoUsuario } from "@/lib/empresa-ativa";
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

  // Empresa ativa (cookie revalidado no banco) e o papel nela: dono = painel
  // completo. Vendedor tem interface própria em /vendedor/*.
  const [ativa, empresas] = await Promise.all([getEmpresaAtiva(), getEmpresasDoUsuario()]);
  const painel = ativa?.papel === "dono" ? ativa : null;
  const modulosHabilitados = painel ? await getModulosHabilitados(painel.workspaceId) : [];

  // Vencimentos e Chat não são módulos do catálogo (lib/modulos/registry.ts):
  // sem banner, sem contador de não lidas e sem as consultas deles.
  const alertas = VENCIMENTOS_HABILITADO ? await getVencimentoAlertas() : [];
  const unreadTotal = CHAT_HABILITADO ? await getUnreadTotal() : 0;

  const { data: tiposAtivosRows } = await supabase
    .from("perfis_tipos_ativos")
    .select("tipo")
    .eq("user_id", user.id);
  const tiposAtivos = (tiposAtivosRows ?? []).map((r) => r.tipo as AccountType);

  // Pedidos de acesso de vendedor: só o dono da empresa ativa os vê (RLS), e
  // só com o módulo Vendedores ligado.
  const workspaceVendedoresId =
    painel && modulosHabilitados.includes("vendedores") ? painel.workspaceId : null;
  let solicitacoesPendentes: SolicitacaoPendente[] = [];
  if (workspaceVendedoresId) {
    const { data } = await supabase
      .from("solicitacoes_vendedor")
      .select("id, email, created_at")
      .eq("workspace_id", workspaceVendedoresId)
      .eq("status", "pendente")
      .order("created_at", { ascending: true });
    solicitacoesPendentes = (data ?? []) as SolicitacaoPendente[];
  }

  const conteudo = (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        userId={user.id}
        tiposAtivos={tiposAtivos}
        chatHref="/juridico"
        unreadTotal={unreadTotal}
        modulosHabilitados={modulosHabilitados}
        ehDono={!!painel}
        empresas={empresas}
        empresaAtivaId={ativa?.workspaceId ?? null}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        {VENCIMENTOS_HABILITADO && <VencimentosBanner alertas={alertas} />}
        <WelcomeBanner />
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );

  return (
    <ToastProvider>
      {workspaceVendedoresId ? (
        <SolicitacoesVendedorProvider
          workspaceId={workspaceVendedoresId}
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
