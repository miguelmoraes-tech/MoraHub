import { ShieldCheck, FileStack, Copyright, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { filtrarContasPorPapel, getContasVinculadas, nomeConta } from "@/lib/colaborador";
import {
  ColaboradorJuridicoBoard,
  type PendenciaComDono,
} from "@/components/colaborador/juridico-board";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import type {
  ComplianceJuridico,
  Juridico,
  Processo,
  PropriedadeIntelectual,
} from "@/lib/types";

export default async function AdvogadoPainelPage() {
  const contas = filtrarContasPorPapel(await getContasVinculadas(), "advogado");
  const donoIds = contas.map((c) => c.dono_id);

  const supabase = await createClient();
  const [
    { data: items },
    { data: compliance },
    { data: propriedades },
    { data: processos },
    { count: modelosCount },
  ] = donoIds.length
    ? ((await Promise.all([
        supabase
          .from("juridico")
          .select("*")
          .in("user_id", donoIds)
          .eq("tipo", "Jurídico")
          .order("prazo", { ascending: true }),
        supabase.from("compliance_juridico").select("*").in("user_id", donoIds),
        supabase
          .from("propriedade_intelectual")
          .select("*")
          .in("user_id", donoIds),
        supabase.from("processos").select("*").in("user_id", donoIds),
        supabase
          .from("modelos_contrato")
          .select("id", { count: "exact", head: true })
          .in("user_id", donoIds),
      ])) as [
        { data: Juridico[] | null },
        { data: ComplianceJuridico[] | null },
        { data: PropriedadeIntelectual[] | null },
        { data: Processo[] | null },
        { count: number | null },
      ])
    : [
        { data: [] as Juridico[] },
        { data: [] as ComplianceJuridico[] },
        { data: [] as PropriedadeIntelectual[] },
        { data: [] as Processo[] },
        { count: 0 },
      ];

  const contasByDono = new Map(contas.map((c) => [c.dono_id, c]));
  const itemsComDono: PendenciaComDono[] = (items ?? []).map((item) => ({
    ...item,
    donoNome: nomeConta(contasByDono.get(item.user_id)),
  }));

  const hoje = todayISO();
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

  const cards: VisaoGeralCard[] = [
    {
      icon: ShieldCheck,
      label: "Compliance",
      value: `${complianceConforme} de ${complianceRegistros.length}`,
      hint: "itens conformes",
      tone: complianceRegistros.length > 0 && complianceConforme === complianceRegistros.length ? "emerald" : "zinc",
      href: "/colaborador/advogado/compliance",
    },
    {
      icon: FileStack,
      label: "Modelos disponíveis",
      value: String(modelosCount ?? 0),
      href: "/colaborador/advogado/modelos-contrato",
    },
    {
      icon: Copyright,
      label: "Propriedade Intelectual em atenção",
      value: String(piEmAtencao),
      tone: piEmAtencao > 0 ? "amber" : "zinc",
      href: "/colaborador/advogado/propriedade-intelectual",
    },
    {
      icon: Gavel,
      label: "Processos com prazo próximo",
      value: String(processosProximos),
      tone: processosProximos > 0 ? "amber" : "zinc",
      href: "/colaborador/advogado/processos",
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <VisaoGeralCards cards={cards} />
      </div>
      <ColaboradorJuridicoBoard
        titulo="Pendências jurídicas"
        items={itemsComDono}
        contas={contas}
        tipoFixo="Jurídico"
      />
    </>
  );
}
