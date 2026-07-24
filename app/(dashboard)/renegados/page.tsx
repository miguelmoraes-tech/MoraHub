import { createClient } from "@/lib/supabase/server";
import { RenegadosBoard } from "@/components/renegados-board";
import type { Renegado } from "@/lib/types";

export default async function RenegadosPage() {
  const supabase = await createClient();
  const { data: renegados } = (await supabase
    .from("renegados")
    .select("*")
    .order("nome")) as {
    data: Renegado[] | null;
  };

  return <RenegadosBoard renegados={renegados ?? []} />;
}
