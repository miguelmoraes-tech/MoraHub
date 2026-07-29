import { Wallet, TrendingUp, Receipt, Scale, Handshake, ArrowLeftRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/stat-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { todayISO } from "@/lib/vencimentos/dates";

type ComprovanteRow = {
  id: string;
  cliente_id: string;
  descricao: string | null;
  valor: number | null;
  data: string | null;
};
type GastoRow = {
  id: string;
  nome: string;
  valor: number | null;
  data: string;
  cliente_id: string | null;
};
type PropostaRow = { valor: number | null };
type ClienteRow = { id: string; nome: string };

type Movimentacao = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  data: string;
  clienteNome: string | null;
};

export default async function DashboardFinanceiroPage() {
  const supabase = await createClient();
  const mesAtual = todayISO().slice(0, 7);

  const [
    { data: comprovantes },
    { data: gastos },
    { data: propostas },
    { data: clientes },
  ] = (await Promise.all([
    supabase
      .from("comprovantes")
      .select("id, cliente_id, descricao, valor, data")
      .order("data", { ascending: false }),
    supabase
      .from("gastos")
      .select("id, nome, valor, data, cliente_id")
      .order("data", { ascending: false }),
    supabase
      .from("propostas")
      .select("valor")
      .in("status", ["enviada", "em_negociacao"]),
    supabase.from("clientes").select("id, nome"),
  ])) as [
    { data: ComprovanteRow[] | null },
    { data: GastoRow[] | null },
    { data: PropostaRow[] | null },
    { data: ClienteRow[] | null },
  ];

  const comprovantesList = comprovantes ?? [];
  const gastosList = gastos ?? [];
  const propostasList = propostas ?? [];
  const clienteNome = new Map((clientes ?? []).map((c) => [c.id, c.nome]));

  const faturamentoTotal = comprovantesList.reduce(
    (sum, c) => sum + (c.valor ?? 0),
    0
  );
  const faturamentoMes = comprovantesList
    .filter((c) => (c.data ?? "").startsWith(mesAtual))
    .reduce((sum, c) => sum + (c.valor ?? 0), 0);
  const gastosTotal = gastosList.reduce((sum, g) => sum + (g.valor ?? 0), 0);
  const saldo = faturamentoTotal - gastosTotal;
  const propostasAbertoTotal = propostasList.reduce(
    (sum, p) => sum + (p.valor ?? 0),
    0
  );

  const movimentacoes: Movimentacao[] = [
    ...comprovantesList.map((c) => ({
      id: `c-${c.id}`,
      tipo: "entrada" as const,
      descricao: c.descricao ?? "Comprovante",
      valor: c.valor ?? 0,
      data: c.data ?? "",
      clienteNome: clienteNome.get(c.cliente_id) ?? null,
    })),
    ...gastosList.map((g) => ({
      id: `g-${g.id}`,
      tipo: "saida" as const,
      descricao: g.nome,
      valor: g.valor ?? 0,
      data: g.data,
      clienteNome: g.cliente_id ? (clienteNome.get(g.cliente_id) ?? null) : null,
    })),
  ]
    .filter((m) => m.data)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 15);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">
          Dashboard Financeiro
        </h1>
        <p className="text-sm text-zinc-500">
          Visão geral de faturamento, gastos e propostas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Faturamento total"
          value={formatCurrency(faturamentoTotal)}
        />
        <StatCard
          icon={TrendingUp}
          label="Faturamento do mês"
          value={formatCurrency(faturamentoMes)}
        />
        <StatCard
          icon={Receipt}
          label="Gastos totais"
          value={formatCurrency(gastosTotal)}
        />
        <StatCard
          icon={Scale}
          label="Saldo aproximado"
          value={formatCurrency(saldo)}
          tone={saldo >= 0 ? "emerald" : "rose"}
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Handshake className="h-4 w-4 text-zinc-500" />
          Propostas em aberto
        </h2>
        <p className="mt-2 text-2xl font-semibold text-copper-400">
          {formatCurrency(propostasAbertoTotal)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {propostasList.length} proposta(s) enviada(s) ou em negociação
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <ArrowLeftRight className="h-4 w-4 text-zinc-500" />
          Movimentações recentes
        </h2>

        {movimentacoes.length > 0 ? (
          <div className="space-y-2">
            {movimentacoes.map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      mov.tipo === "entrada"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    {mov.tipo === "entrada" ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">
                      {mov.descricao}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(mov.data)}
                      {mov.clienteNome && ` · ${mov.clienteNome}`}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    mov.tipo === "entrada" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {mov.tipo === "entrada" ? "+" : "-"} {formatCurrency(mov.valor)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhuma movimentação registrada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
