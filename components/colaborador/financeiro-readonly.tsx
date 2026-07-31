import { Receipt, Wallet } from "lucide-react";
import type { Comprovante, Gasto } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export type GastoComContexto = Gasto & {
  clienteNome: string | null;
  donoNome: string;
};

export type ComprovanteComContexto = Comprovante & {
  clienteNome: string;
  donoNome: string;
};

export function FinanceiroReadOnly({
  gastos,
  comprovantes,
}: {
  gastos: GastoComContexto[];
  comprovantes: ComprovanteComContexto[];
}) {
  const totalGastos = gastos.reduce((acc, g) => acc + g.valor, 0);
  const totalComprovantes = comprovantes.reduce((acc, c) => acc + c.valor, 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">
          Financeiro (somente leitura)
        </h1>
        <p className="text-sm text-zinc-500">
          Resumo dos clientes vinculados, útil para apuração fiscal — a
          edição continua exclusiva do dono de cada conta.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total em gastos</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">
            {formatCurrency(totalGastos)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500">Total em comprovantes</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">
            {formatCurrency(totalComprovantes)}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Wallet className="h-4 w-4 text-zinc-500" />
          Gastos
        </div>
        {gastos.length > 0 ? (
          <div className="space-y-2">
            {gastos.map((gasto) => (
              <div
                key={gasto.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">{gasto.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {gasto.clienteNome ?? "Geral"} · {gasto.donoNome} ·{" "}
                    {formatDate(gasto.data)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-zinc-200">
                  {formatCurrency(gasto.valor)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum gasto registrado.</p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Receipt className="h-4 w-4 text-zinc-500" />
          Comprovantes
        </div>
        {comprovantes.length > 0 ? (
          <div className="space-y-2">
            {comprovantes.map((comprovante) => (
              <div
                key={comprovante.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-200">
                    {comprovante.descricao}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {comprovante.clienteNome} · {comprovante.donoNome}
                    {comprovante.data && ` · ${formatDate(comprovante.data)}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-zinc-200">
                  {formatCurrency(comprovante.valor)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum comprovante registrado.</p>
        )}
      </div>
    </div>
  );
}
