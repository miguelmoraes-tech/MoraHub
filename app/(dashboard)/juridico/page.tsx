import { ShieldCheck, FileStack, Copyright, Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAcessoJuridico } from "@/lib/juridico-acesso";
import { JuridicoBoard } from "@/components/juridico-board";
import { SemAcessoAviso } from "@/components/financeiro/sem-valores";
import { VisaoGeralCards, type VisaoGeralCard } from "@/components/juridico/visao-geral-cards";
import {
  ComplianceReadonlyList,
  PropriedadeIntelectualReadonlyList,
  ProcessosReadonlyList,
} from "@/components/juridico/juridico-readonly-lists";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import type {
  Cliente,
  ComplianceJuridico,
  Juridico,
  Processo,
  PropriedadeIntelectual,
} from "@/lib/types";

/**
 * Visão geral do Jurídico da empresa ativa: pendências (CRUD aqui mesmo),
 * resumos e atalhos para as telas de processos, compliance, propriedade
 * intelectual e modelos. Equipe, convites e chat ficam em /socios e /vendedores.
 */
export default async function JuridicoPage() {
  const jur = await getAcessoJuridico();
  if (!jur) return <SemAcessoAviso titulo="Jurídico & Contábil" />;
  const supabase = await createClient();
  const workspaceId = jur.workspaceId;

  const [
    { data: items },
    { data: compliance },
    { data: propriedades },
    { data: processos },
    { data: clientes },
    { count: modelosCount },
  ] = (await Promise.all([
    supabase
      .from("juridico")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("prazo", { ascending: true }),
    supabase.from("compliance_juridico").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("propriedade_intelectual")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("data_renovacao", { ascending: true }),
    supabase
      .from("processos")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("proximo_prazo", { ascending: true }),
    // Nomes dos clientes: leitura auxiliar, só com permissão em Clientes ("—" sem ela).
    jur.clientes
      ? supabase.from("clientes").select("id, nome").eq("workspace_id", jur.clientes.workspaceId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("modelos_contrato")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ])) as [
    { data: Juridico[] | null },
    { data: ComplianceJuridico[] | null },
    { data: PropriedadeIntelectual[] | null },
    { data: Processo[] | null },
    { data: Pick<Cliente, "id" | "nome">[] | null },
    { count: number | null },
  ];

  const hoje = todayISO();
  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

  const complianceRegistros = compliance ?? [];
  const complianceConforme = complianceRegistros.filter((c) => c.status === "conforme").length;

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
      tone:
        complianceRegistros.length > 0 && complianceConforme === complianceRegistros.length
          ? "emerald"
          : "zinc",
      href: "/juridico/compliance",
    },
    {
      icon: FileStack,
      label: "Modelos disponíveis",
      value: String(modelosCount ?? 0),
      href: "/juridico/modelos-contrato",
    },
    {
      icon: Copyright,
      label: "Propriedade Intelectual em atenção",
      value: String(piEmAtencao),
      tone: piEmAtencao > 0 ? "amber" : "zinc",
      href: "/juridico/propriedade-intelectual",
    },
    {
      icon: Gavel,
      label: "Processos com prazo próximo",
      value: String(processosProximos),
      tone: processosProximos > 0 ? "amber" : "zinc",
      href: "/juridico/processos",
    },
  ];

  const clientesIndisponiveis = !jur.clientes;

  return (
    <>
      <div className="mx-auto max-w-4xl px-6 pt-8">
        <VisaoGeralCards cards={cards} />
      </div>
      <JuridicoBoard items={items ?? []} somenteLeitura={jur.somenteLeitura} />
      <ComplianceReadonlyList
        registros={complianceRegistros}
        clienteNome={clienteNome}
        clientesIndisponiveis={clientesIndisponiveis}
      />
      <PropriedadeIntelectualReadonlyList
        itens={propriedadesItens}
        clienteNome={clienteNome}
        clientesIndisponiveis={clientesIndisponiveis}
      />
      <ProcessosReadonlyList
        processos={processosItens}
        clienteNome={clienteNome}
        clientesIndisponiveis={clientesIndisponiveis}
      />
    </>
  );
}
