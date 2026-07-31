import {
  WorkspaceSidebar,
  type WorkspacePapel,
} from "@/components/colaborador/workspace-sidebar";

export function WorkspaceShell({
  papel,
  contasCount,
  children,
}: {
  papel: WorkspacePapel;
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
