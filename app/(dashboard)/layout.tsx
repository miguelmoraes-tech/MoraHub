import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { VencimentosBanner } from "@/components/vencimentos-banner";
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

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex flex-1 flex-col overflow-y-auto">
        <VencimentosBanner alertas={alertas} />
        {children}
      </main>
    </div>
  );
}
