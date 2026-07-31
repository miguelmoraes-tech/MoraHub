import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import {
  ColaboradorJuridicoBoard,
  type PendenciaComDono,
} from "@/components/colaborador/juridico-board";
import type { Juridico } from "@/lib/types";

export default async function ContadorPainelPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "contador");
  const donoIds = contas.map((c) => c.dono_id);

  const supabase = await createClient();
  const { data: items } = donoIds.length
    ? ((await supabase
        .from("juridico")
        .select("*")
        .in("user_id", donoIds)
        .in("tipo", ["Contábil", "Fiscal"])
        .order("prazo", { ascending: true })) as { data: Juridico[] | null })
    : { data: [] as Juridico[] };

  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));
  const itemsComDono: PendenciaComDono[] = (items ?? []).map((item) => ({
    ...item,
    donoNome: nomeConta(contasByDono.get(item.user_id)),
  }));

  return (
    <ColaboradorJuridicoBoard
      titulo="Pendências contábeis e fiscais"
      items={itemsComDono}
      contas={contas}
      tipoFixo={null}
    />
  );
}
