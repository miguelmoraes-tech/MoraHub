import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import {
  ColaboradorJuridicoBoard,
  type PendenciaComDono,
} from "@/components/colaborador/juridico-board";
import type { Juridico } from "@/lib/types";

export default async function AdvogadoPainelPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);

  const supabase = await createClient();
  const { data: items } = donoIds.length
    ? ((await supabase
        .from("juridico")
        .select("*")
        .in("user_id", donoIds)
        .eq("tipo", "Jurídico")
        .order("prazo", { ascending: true })) as { data: Juridico[] | null })
    : { data: [] as Juridico[] };

  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));
  const itemsComDono: PendenciaComDono[] = (items ?? []).map((item) => ({
    ...item,
    donoNome: nomeConta(contasByDono.get(item.user_id)),
  }));

  return (
    <ColaboradorJuridicoBoard
      titulo="Pendências jurídicas"
      items={itemsComDono}
      contas={contas}
      tipoFixo="Jurídico"
    />
  );
}
