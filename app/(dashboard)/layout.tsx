import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { VencimentosBanner } from "@/components/vencimentos-banner";
import { WelcomeBanner } from "@/components/welcome-banner";
import { PageTransition } from "@/components/page-transition";
import { getVencimentoAlertas } from "@/lib/vencimentos/get-alerts";
import type { AccountType } from "@/lib/hub-mode";

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

  const alertas = await getVencimentoAlertas();

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userEmail={user.email ?? ""}
        temColaboracoes={!!colaboracao}
        tiposAtivos={tiposAtivos}
      />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <VencimentosBanner alertas={alertas} />
        <WelcomeBanner />
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
