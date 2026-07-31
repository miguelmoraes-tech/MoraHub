import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas } from "@/lib/colaborador";
import { WorkspaceShell } from "@/components/colaborador/workspace-shell";

export default async function AdvogadoWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const contasAdvogado = filtrarContasPorPapel(
    await getContasVinculadas(),
    "advogado"
  );
  if (contasAdvogado.length === 0) redirect("/colaborador");

  return (
    <WorkspaceShell papel="advogado" contasCount={contasAdvogado.length}>
      {children}
    </WorkspaceShell>
  );
}
