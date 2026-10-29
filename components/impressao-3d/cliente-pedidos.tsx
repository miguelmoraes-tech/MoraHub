import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import type { ComprasDoCliente } from "@/lib/impressao-3d/cliente";
import { STATUS_PEDIDO_ROTULO } from "@/lib/impressao-3d/tipos-operacao";
import { STATUS_ORCAMENTO_ROTULO, type StatusOrcamento } from "@/lib/impressao-3d/tipos";
import { formatDataIso } from "@/lib/impressao-3d/datas";
import { formatMoeda } from "@/lib/impressao-3d/numeros";

const TH = "py-1.5 pr-3 font-medium";
const THD = "py-1.5 pr-3 text-right font-medium";
const TD = "py-1.5 pr-3";
const TDD = "py-1.5 pr-3 text-right tabular-nums";

/** Seção "Pedidos e orçamentos" do detalhe do cliente (nicho Impressão 3D). Sem custo nem lucro. */
export function ClientePedidosOrcamentos({ dados }: { dados: ComprasDoCliente }) {
  const { pedidos, orcamentos } = dados;
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
        <ClipboardList className="h-4 w-4 text-zinc-500" />
        Pedidos e orçamentos
      </h2>

      {dados.erro && <p className="text-xs text-rose-400">{dados.erro}</p>}

      {pedidos && (
        <div className="mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500">Total comprado</p>
              <p className="text-lg font-semibold tabular-nums text-zinc-100">{formatMoeda(dados.totalComprado)}</p>
              <p className="text-[11px] text-zinc-600">Pedidos não cancelados</p>
            </div>
            <div className="rounded-lg border border-zinc-800 p-3">
              <p className="text-xs text-zinc-500">Última compra</p>
              <p className="text-lg font-semibold text-zinc-100">
                {dados.ultimaCompra ? formatDataIso(dados.ultimaCompra) : "—"}
              </p>
            </div>
          </div>
          {pedidos.length === 0 ? (
            <p className="text-xs text-zinc-600">Nenhum pedido deste cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-zinc-500">
                  <tr>
                    <th className={TH}>Pedido</th>
                    <th className={TH}>Data</th>
                    <th className={TH}>Status</th>
                    <th className={THD}>Total</th>
                    <th className={THD}>Pago</th>
                    <th className={TH}>Prazo</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {pedidos.map((p) => (
                    <tr key={p.id} className="border-t border-zinc-800/70">
                      <td className={TD}>
                        <Link href={`/impressao-3d/pedidos/${p.id}`} className="text-copper-400 hover:text-copper-300">
                          #{p.numero}
                        </Link>
                      </td>
                      <td className={TD}>{formatDataIso(p.data_pedido)}</td>
                      <td className={TD}>
                        <StatusChip tone={p.status === "cancelado" ? "zinc" : "copper"}>
                          {STATUS_PEDIDO_ROTULO[p.status] ?? p.status}
                        </StatusChip>
                      </td>
                      <td className={TDD}>{formatMoeda(p.total)}</td>
                      <td className={TDD}>{formatMoeda(p.pago_valor)}</td>
                      <td className={TD}>{p.prazo_entrega ? formatDataIso(p.prazo_entrega) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {orcamentos && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-zinc-400">Orçamentos</h3>
          {orcamentos.length === 0 ? (
            <p className="text-xs text-zinc-600">Nenhum orçamento deste cliente.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-zinc-500">
                  <tr>
                    <th className={TH}>Orçamento</th>
                    <th className={TH}>Status</th>
                    <th className={THD}>Total</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  {orcamentos.map((o) => (
                    <tr key={o.id} className="border-t border-zinc-800/70">
                      <td className={TD}>
                        <Link href={`/impressao-3d/orcamentos/${o.id}`} className="text-copper-400 hover:text-copper-300">
                          #{o.numero} {o.titulo}
                        </Link>
                      </td>
                      <td className={TD}>{STATUS_ORCAMENTO_ROTULO[o.status as StatusOrcamento] ?? o.status}</td>
                      <td className={TDD}>{formatMoeda(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
