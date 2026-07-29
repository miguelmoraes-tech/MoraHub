import { getCalendarioItems } from "@/lib/vencimentos/get-calendario";
import { CalendarioBoard } from "@/components/calendario-board";

export default async function CalendarioPage() {
  const itens = await getCalendarioItems();

  return <CalendarioBoard itens={itens} />;
}
