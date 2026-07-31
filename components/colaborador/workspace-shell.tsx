import { WorkspaceSidebar } from "@/components/colaborador/workspace-sidebar";
import type { ColaboradorPapel } from "@/lib/types";

export function WorkspaceShell({
  papel,
  contasCount,
  children,
}: {
  papel: ColaboradorPapel;
  contasCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <WorkspaceSidebar papel={papel} contasCount={contasCount} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
