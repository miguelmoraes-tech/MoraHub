import { createClient } from "@/lib/supabase/server";
import { todayISO, diffInDays } from "@/lib/vencimentos/dates";
import type { CandidatoStatus } from "@/lib/types";

type FuncionarioRow = {
  id: string;
  nome: string;
  status: string;
  departamento_id: string | null;
};
type DepartamentoRow = { id: string; nome: string };
type FolhaRow = { status: string; salario_liquido: number | null };
type FeriaRow = {
  id: string;
  funcionario_id: string;
  status: string;
  periodo_aquisitivo_fim: string | null;
};
type VagaRow = { status: string };
type CandidatoRow = { status: CandidatoStatus };
type AvaliacaoRow = { funcionario_id: string; periodo_referencia: string };

export interface RHOverview {
  funcionariosAtivos: number;
  funcionariosPorDepartamento: { departamentoNome: string; total: number }[];
  folhaMes: {
    mesReferencia: string;
    totalFuncionarios: number;
    pagos: number;
    valorTotal: number;
    valorPago: number;
  };
  feriasPendentesCount: number;
  feriasVencendoCount: number;
  feriasVencendoLista: { feriaId: string; funcionarioNome: string; diasRestantes: number }[];
  vagasAbertasCount: number;
  candidatosPorStatus: Record<CandidatoStatus, number>;
  candidatosEmProcessoCount: number;
  avaliacoesPendentesCount: number;
}

const FERIAS_VENCENDO_JANELA_DIAS = 30;
const AVALIACAO_INTERVALO_DIAS = 180;

const CANDIDATO_STATUS_VAZIO: Record<CandidatoStatus, number> = {
  triagem: 0,
  entrevista: 0,
  teste: 0,
  aprovado: 0,
  reprovado: 0,
  contratado: 0,
};

export async function getRHOverview(donoId: string | null): Promise<RHOverview> {
  const vazio: RHOverview = {
    funcionariosAtivos: 0,
    funcionariosPorDepartamento: [],
    folhaMes: {
      mesReferencia: todayISO().slice(0, 7),
      totalFuncionarios: 0,
      pagos: 0,
      valorTotal: 0,
      valorPago: 0,
    },
    feriasPendentesCount: 0,
    feriasVencendoCount: 0,
    feriasVencendoLista: [],
    vagasAbertasCount: 0,
    candidatosPorStatus: { ...CANDIDATO_STATUS_VAZIO },
    candidatosEmProcessoCount: 0,
    avaliacoesPendentesCount: 0,
  };
  if (!donoId) return vazio;

  const supabase = await createClient();
  const hoje = todayISO();
  const mesAtualInicio = `${hoje.slice(0, 7)}-01`;

  const [
    { data: funcionarios },
    { data: departamentos },
    { data: folhas },
    { data: ferias },
    { data: vagas },
    { data: candidatos },
    { data: avaliacoes },
  ] = (await Promise.all([
    supabase
      .from("funcionarios")
      .select("id, nome, status, departamento_id")
      .eq("user_id", donoId),
    supabase.from("departamentos").select("id, nome").eq("user_id", donoId),
    supabase
      .from("folha_pagamento")
      .select("status, salario_liquido")
      .eq("user_id", donoId)
      .eq("mes_referencia", mesAtualInicio),
    supabase
      .from("ferias")
      .select("id, funcionario_id, status, periodo_aquisitivo_fim")
      .eq("user_id", donoId)
      .neq("status", "concluida"),
    supabase.from("vagas").select("status").eq("user_id", donoId),
    supabase.from("candidatos").select("status").eq("user_id", donoId),
    supabase
      .from("avaliacoes_desempenho")
      .select("funcionario_id, periodo_referencia")
      .eq("user_id", donoId),
  ])) as [
    { data: FuncionarioRow[] | null },
    { data: DepartamentoRow[] | null },
    { data: FolhaRow[] | null },
    { data: FeriaRow[] | null },
    { data: VagaRow[] | null },
    { data: CandidatoRow[] | null },
    { data: AvaliacaoRow[] | null },
  ];

  const funcionariosList = funcionarios ?? [];
  const funcionariosAtivosList = funcionariosList.filter((f) => f.status === "ativo");
  const departamentoNome = new Map((departamentos ?? []).map((d) => [d.id, d.nome]));
  const funcionarioNome = new Map(funcionariosList.map((f) => [f.id, f.nome]));

  const porDepartamentoMap = new Map<string, number>();
  for (const f of funcionariosAtivosList) {
    const nome = f.departamento_id
      ? (departamentoNome.get(f.departamento_id) ?? "Sem departamento")
      : "Sem departamento";
    porDepartamentoMap.set(nome, (porDepartamentoMap.get(nome) ?? 0) + 1);
  }

  const folhasList = folhas ?? [];
  const folhasPagas = folhasList.filter((f) => f.status === "pago");

  const feriasList = ferias ?? [];
  const feriasVencendoLista = feriasList
    .filter((f) => f.periodo_aquisitivo_fim)
    .map((f) => ({
      feriaId: f.id,
      funcionarioNome: funcionarioNome.get(f.funcionario_id) ?? "Funcionário",
      diasRestantes: diffInDays(hoje, f.periodo_aquisitivo_fim as string),
    }))
    .filter((f) => f.diasRestantes <= FERIAS_VENCENDO_JANELA_DIAS)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const candidatosPorStatus: Record<CandidatoStatus, number> = { ...CANDIDATO_STATUS_VAZIO };
  for (const c of candidatos ?? []) {
    candidatosPorStatus[c.status] = (candidatosPorStatus[c.status] ?? 0) + 1;
  }
  const candidatosEmProcessoCount =
    candidatosPorStatus.triagem +
    candidatosPorStatus.entrevista +
    candidatosPorStatus.teste;

  const ultimaAvaliacaoPorFuncionario = new Map<string, string>();
  for (const a of avaliacoes ?? []) {
    const atual = ultimaAvaliacaoPorFuncionario.get(a.funcionario_id);
    if (!atual || a.periodo_referencia > atual) {
      ultimaAvaliacaoPorFuncionario.set(a.funcionario_id, a.periodo_referencia);
    }
  }
  const avaliacoesPendentesCount = funcionariosAtivosList.filter((f) => {
    const ultima = ultimaAvaliacaoPorFuncionario.get(f.id);
    if (!ultima) return true;
    return diffInDays(ultima, hoje) >= AVALIACAO_INTERVALO_DIAS;
  }).length;

  return {
    funcionariosAtivos: funcionariosAtivosList.length,
    funcionariosPorDepartamento: [...porDepartamentoMap.entries()]
      .map(([departamentoNome, total]) => ({ departamentoNome, total }))
      .sort((a, b) => b.total - a.total),
    folhaMes: {
      mesReferencia: mesAtualInicio,
      totalFuncionarios: folhasList.length,
      pagos: folhasPagas.length,
      valorTotal: folhasList.reduce((sum, f) => sum + (f.salario_liquido ?? 0), 0),
      valorPago: folhasPagas.reduce((sum, f) => sum + (f.salario_liquido ?? 0), 0),
    },
    feriasPendentesCount: feriasList.filter((f) => f.status === "pendente").length,
    feriasVencendoCount: feriasVencendoLista.length,
    feriasVencendoLista: feriasVencendoLista.slice(0, 5),
    vagasAbertasCount: (vagas ?? []).filter((v) => v.status === "aberta").length,
    candidatosPorStatus,
    candidatosEmProcessoCount,
    avaliacoesPendentesCount,
  };
}
