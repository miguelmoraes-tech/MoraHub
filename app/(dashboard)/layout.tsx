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
import { getModulosHabilitados, getModulosPermiteMembros } from "@/lib/modulos/habilitados";
import { ehPapelRestrito, temPainelCompleto } from "@/lib/empresas";
import {
  lerPermissoesProprias,
  modulosDasPermissoes,
  modulosVisiveis,
  type PermissaoModulo,
} from "@/lib/modulos/permissoes";
import { configDoSino } from "@/lib/impressao-3d/sino";
import { getPreferenciasNavegacao } from "@/lib/modulos/preferencias-servidor";
import { getEmpresaAtiva, getEmpresasDoUsuario } from "@/lib/empresa-ativa";
import { ToastProvider } from "@/components/toast";
import { RotulosProvider } from "@/components/rotulos-provider";
import { getConfigEmpresa } from "@/lib/rotulos";
import { getAprovacoes } from "@/lib/aprovacoes";
import { AprovacoesProvider } from "@/components/aprovacoes/aprovacoes-provider";
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

  // Empresa ativa (cookie revalidado no banco) e o papel nela: fundador e
  // cofundador = painel completo; sócio e funcionário = só os módulos da
  // empresa que as permissões deles liberam. Vendedor tem interface própria
  // em /vendedor/*.
  const [ativa, empresas, configEmpresa, preferencias] = await Promise.all([
    getEmpresaAtiva(),
    getEmpresasDoUsuario(),
    getConfigEmpresa(),
    getPreferenciasNavegacao(),
  ]);
  const painel = ativa && temPainelCompleto(ativa.papel) ? ativa : null;
  const restrito = !!ativa && ehPapelRestrito(ativa.papel);
  let modulosHabilitados: string[] = [];
  let permissoesProprias: PermissaoModulo[] = [];
  if (painel) {
    modulosHabilitados = await getModulosHabilitados(painel.workspaceId);
  } else if (restrito && ativa) {
    const [habilitados, permissoes, permiteMembros] = await Promise.all([
      getModulosHabilitados(ativa.workspaceId),
      lerPermissoesProprias(supabase, ativa.workspaceId, user.id),
      getModulosPermiteMembros(),
    ]);
    permissoesProprias = permissoes;
    modulosHabilitados = modulosVisiveis(
      habilitados,
      modulosDasPermissoes(permissoes),
      permiteMembros
    );
  }
  // Sino de alertas do nicho Impressão 3D: só com Dashboard ou Automações ligados e liberados.
  const sinoAlertas = configDoSino(modulosHabilitados, !!painel, permissoesProprias);

  // Vencimentos e Chat não são módulos do catálogo (lib/modulos/registry.ts):
  // sem banner, sem contador de não lidas e sem as consultas deles.
  const alertas = VENCIMENTOS_HABILITADO ? await getVencimentoAlertas() : [];
  const unreadTotal = CHAT_HABILITADO ? await getUnreadTotal() : 0;

  const { data: tiposAtivosRows } = await supabase
    .from("perfis_tipos_ativos")
    .select("tipo")
    .eq("user_id", user.id);
  const tiposAtivos = (tiposAtivosRows ?? []).map((r) => r.tipo as AccountType);

  // Pedidos de acesso (vendedor ou setor): só o painel completo da empresa
  // ativa os vê (RLS). Os de setor chegam com o id do setor, cujo nome vem de
  // perfis_acesso (select do dono/cofundador).
  const workspacePedidosId = painel ? painel.workspaceId : null;
  let solicitacoesPendentes: SolicitacaoPendente[] = [];
  let setoresNomes: Record<string, string> = {};
  if (workspacePedidosId) {
    const [{ data }, { data: setores }] = await Promise.all([
      supabase
        .from("solicitacoes_vendedor")
        .select("id, email, created_at, perfil_acesso_id, papel_solicitado")
        .eq("workspace_id", workspacePedidosId)
        .eq("status", "pendente")
        .order("created_at", { ascending: true }),
      supabase.from("perfis_acesso").select("id, nome").eq("workspace_id", workspacePedidosId),
    ]);
    solicitacoesPendentes = (data ?? []) as SolicitacaoPendente[];
    setoresNomes = Object.fromEntries(
      ((setores ?? []) as { id: string; nome: string }[]).map((s) => [s.id, s.nome])
    );
  }

  // Aprovações entre fundadores: só o painel completo lê (a tabela é de fundadores).
  const aprovacoesIniciais = workspacePedidosId ? await getAprovacoes(workspacePedidosId) : [];

  const conteudo = (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        userId={user.id}
        tiposAtivos={tiposAtivos}
        chatHref="/juridico"
        unreadTotal={unreadTotal}
        modulosHabilitados={modulosHabilitados}
        painelCompleto={!!painel}
        restrito={restrito}
        empresas={empresas}
        empresaAtivaId={ativa?.workspaceId ?? null}
        sinoAlertas={sinoAlertas}
        preferencia={preferencias.efetiva}
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
      <RotulosProvider mapa={configEmpresa.mapa}>
      {workspacePedidosId ? (
        <AprovacoesProvider workspaceId={workspacePedidosId} inicial={aprovacoesIniciais}>
          <SolicitacoesVendedorProvider
            workspaceId={workspacePedidosId}
            initialPendentes={solicitacoesPendentes}
            initialSetores={setoresNomes}
          >
            {conteudo}
          </SolicitacoesVendedorProvider>
        </AprovacoesProvider>
      ) : (
        conteudo
      )}
      </RotulosProvider>
    </ToastProvider>
  );
}
