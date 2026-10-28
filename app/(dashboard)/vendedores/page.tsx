import { redirect } from "next/navigation";
import { getWorkspaceIdAtivo } from "@/lib/empresa-ativa";
import { createClient } from "@/lib/supabase/server";
import { getColaboradoresDaEmpresa } from "@/lib/colaboradores";
import { ColaboradoresSection } from "@/components/colaboradores-section";
import { CodigoGestorSection } from "@/components/vendedor/codigo-gestor-section";
import { ToastProvider } from "@/components/toast";
import type { SolicitacaoVendedor } from "@/lib/vendedor-shared";
import { getConversasComoDono, getUnreadCountsByConversa } from "@/lib/chat";
import type { Convite } from "@/lib/types";

/**
 * Manage vendedores: the company's access code and the requests it brings,
 * plus the same invite/remove UI used for every colaborador (Jurídico &
 * Contábil page), narrowed to the 'comercial' papel.
 */
export default async function VendedoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The code (and who asked for it) belongs to the caller's own company. The
  // RPC creates it on first view and is idempotent; if it refuses (e.g. the
  // caller is a colaborador, not the dono) the section just doesn't show.
  const workspaceId = await getWorkspaceIdAtivo();
  const [{ data: codigo }, { data: solicitacoes }] = workspaceId
    ? await Promise.all([
        supabase.rpc("meu_codigo_vendedor", { p_workspace_id: workspaceId }),
        supabase
          .from("solicitacoes_vendedor")
          .select("id, workspace_id, user_id, email, status, created_at, respondido_em")
          .eq("workspace_id", workspaceId)
          .eq("status", "pendente")
          // Pedidos de setor têm o próprio fluxo (sino e /socios); aqui só os de vendedor.
          .is("perfil_acesso_id", null)
          .order("created_at", { ascending: true }),
      ])
    : [{ data: null }, { data: null }];

  const [{ data: convites }, { data: colaboradores }, conversas] = await Promise.all([
    supabase
      .from("convites")
      .select("*")
      .eq("workspace_id", workspaceId ?? "")
      .eq("papel", "comercial")
      .order("created_at", { ascending: false }) as unknown as Promise<{
      data: Convite[] | null;
    }>,
    getColaboradoresDaEmpresa(supabase, workspaceId).then((data) => ({ data })),
    getConversasComoDono(),
  ]);
  const unreadByConversa = await getUnreadCountsByConversa(conversas.map((c) => c.id));
  const conversaByColaborador = new Map(
    conversas.map((c) => [`${c.membro_id}|${c.papel}`, c.id])
  );

  return (
    <ToastProvider>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-zinc-100">Vendedores</h1>
          <p className="text-sm text-zinc-500">
            Convide vendedores para ver os leads, marcar reuniões e converter
            clientes — sem poder editar nada.
          </p>
        </div>
        {typeof codigo === "string" && (
          <CodigoGestorSection
            codigo={codigo}
            solicitacoes={(solicitacoes ?? []) as SolicitacaoVendedor[]}
          />
        )}
        <ColaboradoresSection
          papelFixo="comercial"
          titulo="Vendedores"
          convites={convites ?? []}
          colaboradores={(colaboradores ?? []).filter((c) => c.papel === "comercial")}
          conversaByColaborador={conversaByColaborador}
          unreadByConversa={unreadByConversa}
          currentUserId={user.id}
        />
      </div>
    </ToastProvider>
  );
}
