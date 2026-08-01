import { createClient } from "@/lib/supabase/server";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { RenegadosBoard } from "@/components/renegados-board";
import type { Renegado } from "@/lib/types";

export default async function RenegadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspaceId = user ? await getWorkspaceIdPadrao(user.id, "empresarial") : null;

  const { data: renegados } = (await supabase
    .from("renegados")
    .select("*")
    .eq("workspace_id", workspaceId ?? "")
    .order("nome")) as {
    data: Renegado[] | null;
  };

  return <RenegadosBoard renegados={renegados ?? []} />;
}
