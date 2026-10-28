import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { PontoBoard } from "@/components/rh/ponto-board";
import type { ControlePonto, Funcionario } from "@/lib/types";

export default async function PontoPage() {
  const donoId = await getDonoIdAtivo();
  const supabase = await createClient();

  const [{ data: registros }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("controle_ponto")
          .select("*")
          .eq("user_id", donoId)
          .order("data", { ascending: true }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .eq("status", "ativo")
          .order("nome", { ascending: true }),
      ])) as [{ data: ControlePonto[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as ControlePonto[] }, { data: [] as Funcionario[] }];

  return <PontoBoard registros={registros ?? []} funcionarios={funcionarios ?? []} />;
}
