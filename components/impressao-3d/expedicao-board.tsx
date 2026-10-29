"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useToast } from "@/components/toast";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  AreaTexto, Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { atualizarEnvio, criarEnvio, excluirEnvio, mudarStatusEnvio } from "@/app/(dashboard)/impressao-3d/expedicao/actions";
import { STATUS_ENVIO_ROTULO, type Envio, type StatusEnvio } from "@/lib/impressao-3d/tipos-operacao";
import type { OpcaoPedido, Opcoes } from "@/lib/impressao-3d/opcoes";
import { ACOES_ENVIO, pedidoAceitaEnvio, podeExcluirEnvio } from "@/lib/impressao-3d/regras-operacao";
import { formatDataHora, formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";

const TOM_STATUS_ENVIO: Record<StatusEnvio, ChipTone> = {
  preparando: "zinc",
  postado: "sky",
  em_transito: "sky",
  entregue: "emerald",
  devolvido: "amber",
  problema: "rose",
};

function CamposEnvio({
  item,
  pedidos,
}: {
  item?: Envio;
  pedidos: OpcaoPedido[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {!item && (
        <Seletor rotulo="Pedido *" name="pedido_id" required defaultValue="" className="col-span-2">
          <option value="" disabled>Selecione um pedido pronto ou enviado...</option>
          {pedidos.map((p) => (
            <option key={p.id} value={p.id}>#{p.numero} · {p.cliente}</option>
          ))}
        </Seletor>
      )}
      <Entrada rotulo="Transportadora" name="transportadora" defaultValue={item?.transportadora ?? ""} placeholder="Correios, Jadlog..." />
      <Entrada rotulo="Serviço" name="servico" defaultValue={item?.servico ?? ""} placeholder="PAC, SEDEX..." />
      <Entrada rotulo="Código de rastreio" name="codigo_rastreio" defaultValue={item?.codigo_rastreio ?? ""} ajuda="Digitado à mão: não há consulta automática." />
      <Entrada rotulo="Link de rastreio" name="url_rastreio" defaultValue={item?.url_rastreio ?? ""} placeholder="https://" className="col-span-2" />
      <Numero rotulo="Custo do frete (R$)" name="custo_frete" defaultValue={item?.custo_frete ?? ""} />
      <Numero rotulo="Peso (kg)" name="peso_kg" defaultValue={item?.peso_kg ?? ""} />
      <Entrada rotulo="Volumes *" name="volumes" type="number" min="1" step="1" required defaultValue={item?.volumes ?? 1} />
      <Entrada rotulo="Previsão de entrega" name="previsao_entrega" type="date" defaultValue={item?.previsao_entrega ?? ""} />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
    </div>
  );
}

function FormEnvio({ item, pedidos, aoFechar }: { item?: Envio; pedidos: OpcaoPedido[]; aoFechar: () => void }) {
  const acao = item ? atualizarEnvio.bind(null, item.id) : criarEnvio;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposEnvio item={item} pedidos={pedidos} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : item ? "Salvar" : "Criar envio"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormStatus({
  envio,
  alvo,
  rotulo,
  aoFechar,
}: {
  envio: Envio;
  alvo: string;
  rotulo: string;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function enviar(formData: FormData) {
    iniciar(async () => {
      const r = await mudarStatusEnvio(envio.id, alvo, formData);
      if (r && "error" in r) {
        setErro(r.error);
        toast.error(r.error);
        return;
      }
      toast.success("Status do envio atualizado.");
      aoFechar();
      router.refresh();
    });
  }

  return (
    <form action={enviar} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <p className="text-sm font-medium text-zinc-100">{rotulo}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Entrada rotulo="Data" name="data" type="date" ajuda="Vazio = hoje." />
        {alvo === "entregue" && <Entrada rotulo="Quem recebeu" name="recebedor" className="col-span-2" />}
      </div>
      {alvo === "postado" && <p className="text-[11px] text-zinc-600">Postar leva o pedido a &quot;Enviado&quot;.</p>}
      {alvo === "entregue" && (
        <p className="text-[11px] text-zinc-600">Entregar o último envio do pedido leva o pedido a &quot;Entregue&quot;.</p>
      )}
      {erro && <p className="text-xs text-rose-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Confirmar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function LinhaEnvio({
  envio,
  pedido,
  pedidos,
  podeEditar,
}: {
  envio: Envio;
  pedido: OpcaoPedido | undefined;
  pedidos: OpcaoPedido[];
  podeEditar: boolean;
}) {
  const [modo, setModo] = useState<"nenhum" | "editar" | { alvo: string; rotulo: string }>("nenhum");
  const { executar, pendente } = useAcao();
  const fechar = () => setModo("nenhum");
  const acoes = podeEditar ? ACOES_ENVIO[envio.status] : [];

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
              {pedido ? (
                <Link href={`/impressao-3d/pedidos/${pedido.id}`} className="hover:underline">
                  Pedido <span className="text-copper-400">#{pedido.numero}</span> · {pedido.cliente}
                </Link>
              ) : (
                "Pedido"
              )}
              <StatusChip tone={TOM_STATUS_ENVIO[envio.status]}>{STATUS_ENVIO_ROTULO[envio.status]}</StatusChip>
            </p>
            <p className="text-xs text-zinc-500">
              {[envio.transportadora, envio.servico].filter(Boolean).join(" · ") || "Transportadora não informada"}
              {` · ${envio.volumes} volume(s)`}
              {envio.peso_kg !== null && ` · ${formatNumero(envio.peso_kg, 3)} kg`}
              {envio.custo_frete > 0 && ` · frete ${formatMoeda(envio.custo_frete)}`}
            </p>
            <p className="text-xs text-zinc-500">
              {envio.codigo_rastreio ? `Rastreio: ${envio.codigo_rastreio}` : "Sem código de rastreio"}
              {envio.url_rastreio && (
                <>
                  {" · "}
                  <a href={envio.url_rastreio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-copper-400 hover:underline">
                    Abrir rastreio <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {envio.previsao_entrega && `Previsão ${formatDate(envio.previsao_entrega)}`}
              {envio.postado_em && ` · postado ${formatDataHora(envio.postado_em)}`}
              {envio.entregue_em && ` · entregue ${formatDataHora(envio.entregue_em)}`}
              {envio.recebedor && ` · recebido por ${envio.recebedor}`}
            </p>
            {envio.observacoes && <p className="text-xs text-zinc-600">{envio.observacoes}</p>}
          </div>
          {podeEditar && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
              {acoes.map((a) => (
                <BotaoTexto key={a.alvo} onClick={() => setModo({ alvo: a.alvo, rotulo: a.rotulo })}>{a.rotulo}</BotaoTexto>
              ))}
              <button type="button" aria-label="Editar envio" onClick={() => setModo("editar")} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {podeExcluirEnvio(envio.status) && (
                <button
                  type="button"
                  disabled={pendente}
                  aria-label="Excluir envio"
                  onClick={() => executar(() => excluirEnvio(envio.id), { confirmar: "Excluir este envio?", sucesso: "Envio excluído." })}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {modo === "editar" && <FormEnvio item={envio} pedidos={pedidos} aoFechar={fechar} />}
      {typeof modo === "object" && <FormStatus envio={envio} alvo={modo.alvo} rotulo={modo.rotulo} aoFechar={fechar} />}
    </div>
  );
}

export function ExpedicaoBoard({
  envios,
  pedidos,
  podeEditar,
}: {
  envios: Envio[];
  pedidos: Opcoes<OpcaoPedido>;
  podeEditar: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState("");
  const porId = useMemo(() => new Map(pedidos.itens.map((p) => [p.id, p])), [pedidos.itens]);
  const elegiveis = pedidos.itens.filter((p) => pedidoAceitaEnvio(p.status as never));
  const visiveis = envios.filter((e) => !statusFiltro || STATUS_ENVIO_ROTULO[e.status] === statusFiltro);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Expedição</h1>
          <p className="text-sm text-zinc-500">{visiveis.length} envio(s)</p>
        </div>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo envio
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      <div className="mb-4">
        <Aviso>
          O rastreio é <strong>manual</strong>: digite o código e o link da transportadora. Não há consulta automática de status nem
          emissão de etiqueta (integração com Correios e transportadoras depende de credenciais externas e não está ligada).
        </Aviso>
      </div>
      {!pedidos.acessivel && (
        <div className="mb-4">
          <Aviso tom="alerta">Sem acesso a Pedidos: os envios aparecem sem número e cliente e não é possível criar envio.</Aviso>
        </div>
      )}
      {novo && (
        <div className="mb-5">
          {pedidos.acessivel && elegiveis.length === 0 ? (
            <Aviso tom="alerta">Nenhum pedido pronto ou enviado. Marque um pedido como pronto para criar o envio.</Aviso>
          ) : (
            <FormEnvio pedidos={elegiveis} aoFechar={() => setNovo(false)} />
          )}
        </div>
      )}

      <div className="mb-6">
        <SegmentFilter
          value={statusFiltro}
          options={Object.values(STATUS_ENVIO_ROTULO)}
          allLabel="Todos os status"
          onChange={setStatusFiltro}
        />
      </div>

      <Cartao titulo="Envios" icone={<Truck className="h-4 w-4" />}>
        {visiveis.length === 0 ? (
          <Vazio>{envios.length === 0 ? "Nenhum envio ainda. Crie um envio para um pedido pronto." : "Nenhum envio com esse status."}</Vazio>
        ) : (
          <div className="space-y-2">
            {visiveis.map((e) => (
              <LinhaEnvio key={e.id} envio={e} pedido={porId.get(e.pedido_id)} pedidos={elegiveis} podeEditar={podeEditar} />
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
