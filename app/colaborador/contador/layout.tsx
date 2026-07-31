import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas } from "@/lib/colaborador";
import { WorkspaceShell } from "@/components/colaborador/workspace-shell";

export default async function ContadorWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contasContador = filtrarContasPorPapel(
    await getContasVinculadas(),
    "contador"
  );
  if (contasContador.length === 0) redirect("/colaborador");

  return (
    <WorkspaceShell papel="contador" contasCount={contasContador.length}>
      {children}
    </WorkspaceShell>
  );
}
