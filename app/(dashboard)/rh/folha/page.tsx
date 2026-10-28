import { createClient } from "@/lib/supabase/server";
import { getDonoIdAtivo } from "@/lib/empresa-ativa";
import { FolhaPagamentoBoard } from "@/components/rh/folha-pagamento-board";
import type { FolhaPagamento, Funcionario } from "@/lib/types";

export default async function FolhaPagamentoPage() {
  const donoId = await getDonoIdAtivo();
  const supabase = await createClient();

  const [{ data: folhas }, { data: funcionarios }] = donoId
    ? ((await Promise.all([
        supabase
          .from("folha_pagamento")
          .select("*")
          .eq("user_id", donoId)
          .order("mes_referencia", { ascending: false }),
        supabase
          .from("funcionarios")
          .select("*")
          .eq("user_id", donoId)
          .order("nome", { ascending: true }),
      ])) as [{ data: FolhaPagamento[] | null }, { data: Funcionario[] | null }])
    : [{ data: [] as FolhaPagamento[] }, { data: [] as Funcionario[] }];

  return <FolhaPagamentoBoard folhas={folhas ?? []} funcionarios={funcionarios ?? []} />;
}
