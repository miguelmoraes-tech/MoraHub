import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { VencimentosBanner } from "@/components/vencimentos-banner";
import { PageTransition } from "@/components/page-transition";
import { getVencimentoAlertas } from "@/lib/vencimentos/get-alerts";

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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email ?? ""} temColaboracoes={!!colaboracao} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <VencimentosBanner alertas={alertas} />
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
