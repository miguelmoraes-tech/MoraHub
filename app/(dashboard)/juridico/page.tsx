import { ShieldCheck, FileStack, Copyright, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JuridicoBoard } from "@/components/juridico-board";
import { ColaboradoresSection } from "@/components/colaboradores-section";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import {
  ComplianceReadonlyList,
  PropriedadeIntelectualReadonlyList,
  ProcessosReadonlyList,
} from "@/components/juridico/juridico-readonly-lists";
import { getConversasComoDono, getUnreadCountsByConversa } from "@/lib/chat";
import { getWorkspaceIdPadrao } from "@/lib/workspace";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import type {
  ColaboradorVinculado,
  Cliente,
  ComplianceJuridico,
  Convite,
  Juridico,
  Processo,
  PropriedadeIntelectual,
} from "@/lib/types";

export default async function JuridicoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const workspaceId = user ? await getWorkspaceIdPadrao(user.id, "empresarial") : null;

  const [
    { data: items },
    { data: convites },
    { data: colaboradores },
    { data: compliance },
    { data: propriedades },
    { data: processos },
    { data: clientes },
    { count: modelosCount },
  ] = (await Promise.all([
    supabase.from("juridico").select("*").order("prazo", { ascending: true }),
    supabase.from("convites").select("*").order("created_at", { ascending: false }),
    supabase.rpc("get_colaboradores_do_dono"),
    supabase.from("compliance_juridico").select("*"),
    supabase
      .from("propriedade_intelectual")
      .select("*")
      .order("data_renovacao", { ascending: true }),
    supabase.from("processos").select("*").order("proximo_prazo", { ascending: true }),
    supabase.from("clientes").select("id, nome").eq("workspace_id", workspaceId ?? ""),
    supabase.from("modelos_contrato").select("id", { count: "exact", head: true }),
  ])) as [
    { data: Juridico[] | null },
    { data: Convite[] | null },
    { data: ColaboradorVinculado[] | null },
    { data: ComplianceJuridico[] | null },
    { data: PropriedadeIntelectual[] | null },
    { data: Processo[] | null },
    { data: Pick<Cliente, "id" | "nome">[] | null },
    { count: number | null },
  ];

  const hoje = todayISO();
  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

  const complianceRegistros = compliance ?? [];
  const complianceConforme = complianceRegistros.filter(
    (c) => c.status === "conforme"
  ).length;

  const propriedadesItens = propriedades ?? [];
  const piEmAtencao = propriedadesItens.filter((p) => {
    if (p.status === "vencido") return true;
    if (!p.data_renovacao) return false;
    const dias = diffInDays(hoje, p.data_renovacao);
    return dias >= 0 && dias <= 30;
  }).length;

  const processosItens = processos ?? [];
  const processosProximos = processosItens.filter((p) => {
    if (p.fase === "encerrado" || !p.proximo_prazo) return false;
    const dias = diffInDays(hoje, p.proximo_prazo);
    return dias >= 0 && dias <= 7;
  }).length;

  const conversas = await getConversasComoDono();
  const conversaByColaborador = new Map(
    conversas.map((c) => [`${c.membro_id}|${c.papel}`, c.id])
  );
  const unreadByConversa = await getUnreadCountsByConversa(
    conversas.map((c) => c.id)
  );

  const cards: VisaoGeralCard[] = [
    {
      icon: ShieldCheck,
      label: "Compliance",
      value: `${complianceConforme} de ${complianceRegistros.length}`,
      hint: "itens conformes",
      tone: complianceRegistros.length > 0 && complianceConforme === complianceRegistros.length ? "emerald" : "zinc",
      href: "#compliance",
    },
    {
      icon: FileStack,
      label: "Modelos disponíveis",
      value: String(modelosCount ?? 0),
      href: "/documentos",
    },
    {
      icon: Copyright,
      label: "Propriedade Intelectual em atenção",
      value: String(piEmAtencao),
      tone: piEmAtencao > 0 ? "amber" : "zinc",
      href: "#propriedade-intelectual",
    },
    {
      icon: Gavel,
      label: "Processos com prazo próximo",
      value: String(processosProximos),
      tone: processosProximos > 0 ? "amber" : "zinc",
      href: "#processos",
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <VisaoGeralCards cards={cards} />
      </div>
      <JuridicoBoard items={items ?? []} />
      <ComplianceReadonlyList registros={complianceRegistros} clienteNome={clienteNome} />
      <PropriedadeIntelectualReadonlyList itens={propriedadesItens} clienteNome={clienteNome} />
      <ProcessosReadonlyList processos={processosItens} clienteNome={clienteNome} />
      <div className="mx-auto max-w-4xl px-6 pb-8">
        {user && (
          <ColaboradoresSection
            convites={convites ?? []}
            colaboradores={colaboradores ?? []}
            conversaByColaborador={conversaByColaborador}
            unreadByConversa={unreadByConversa}
            currentUserId={user.id}
          />
        )}
      </div>
    </>
  );
}
