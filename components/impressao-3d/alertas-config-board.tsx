"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Aviso, BotaoPrimario, Cartao, ErroForm, Numero, SomenteLeitura } from "@/components/impressao-3d/campos";
import { salvarConfigAlertas } from "@/app/(dashboard)/impressao-3d/notificacoes/actions";
import { FAIXAS_CONFIG_ALERTAS as F, type ConfigAlertas } from "@/lib/impressao-3d/alertas";

function Interruptor({ nome, rotulo, ajuda, marcado }: { nome: string; rotulo: string; ajuda: string; marcado: boolean }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-zinc-800 p-3">
      <input type="checkbox" name={nome} defaultChecked={marcado} className="mt-0.5" />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-zinc-100">{rotulo}</span>
        <span className="block text-[11px] leading-snug text-zinc-500">{ajuda}</span>
      </span>
    </label>
  );
}

const faixa = (f: { min: number; max: number }) => `De ${f.min} a ${f.max}.`;

export function AlertasConfigBoard({
  config, erro, podeEditar,
}: {
  config: ConfigAlertas | null;
  erro: string | null;
  podeEditar: boolean;
}) {
  const [state, formAction, pendente] = useActionState(salvarConfigAlertas, undefined);
  useActionToast(state, { success: "Configuração dos alertas salva." });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
      <div>
        <Link href="/impressao-3d/notificacoes" className="mb-2 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3 w-3" /> Notificações
        </Link>
        <h1 className="text-lg font-semibold text-zinc-100">Configurar alertas</h1>
        <p className="text-sm text-zinc-500">
          Quando o sistema deve avisar. Os alertas são calculados pelo banco; depois de salvar, abra o sino para ver o efeito.
        </p>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {!erro && !config && (
        <Aviso tom="alerta">
          A configuração dos alertas ainda não está disponível. Abra o sino de alertas ou o Dashboard e recarregue esta tela.
        </Aviso>
      )}

      {config && (
        <form action={formAction} className="space-y-5">
          <fieldset disabled={!podeEditar} className="space-y-5 disabled:opacity-80">
            <Cartao titulo="Estoque e manutenção">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Interruptor
                  nome="estoque_baixo"
                  rotulo="Material abaixo do mínimo"
                  ajuda="Avisa quando o saldo de um material chega ao estoque mínimo cadastrado nele."
                  marcado={config.estoque_baixo}
                />
                <Interruptor
                  nome="manutencao"
                  rotulo="Manutenção de impressora"
                  ajuda="Avisa quando uma impressora atinge o intervalo de manutenção cadastrado nela."
                  marcado={config.manutencao}
                />
              </div>
            </Cartao>

            <Cartao titulo="Pedidos, orçamentos e compras">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Numero
                  rotulo="Prazo do pedido (dias)"
                  ajuda={`Dias de antecedência do prazo de entrega para alertar um pedido em aberto. ${faixa(F.prazo_pedido_dias)}`}
                  name="prazo_pedido_dias"
                  step="1"
                  min={F.prazo_pedido_dias.min}
                  max={F.prazo_pedido_dias.max}
                  defaultValue={config.prazo_pedido_dias}
                />
                <Numero
                  rotulo="Pagamento pendente (dias)"
                  ajuda={`Dias que um pedido pode ficar com pagamento pendente antes de alertar. ${faixa(F.pagamento_pendente_dias)}`}
                  name="pagamento_pendente_dias"
                  step="1"
                  min={F.pagamento_pendente_dias.min}
                  max={F.pagamento_pendente_dias.max}
                  defaultValue={config.pagamento_pendente_dias}
                />
                <Numero
                  rotulo="Compra pendente (dias)"
                  ajuda={`Dias que uma compra aprovada pode ficar sem recebimento antes de alertar. ${faixa(F.compra_pendente_dias)}`}
                  name="compra_pendente_dias"
                  step="1"
                  min={F.compra_pendente_dias.min}
                  max={F.compra_pendente_dias.max}
                  defaultValue={config.compra_pendente_dias}
                />
              </div>
              <div className="mt-4">
                <Interruptor
                  nome="orcamento_validade"
                  rotulo="Validade do orçamento"
                  ajuda="Avisa sobre a validade dos orçamentos enviados."
                  marcado={config.orcamento_validade}
                />
              </div>
            </Cartao>

            <Cartao titulo="Falhas recorrentes">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Numero
                  rotulo="Limite de falhas"
                  ajuda={`Quantas falhas, dentro da janela abaixo, geram o alerta. ${faixa(F.falhas_recorrentes_limite)}`}
                  name="falhas_recorrentes_limite"
                  step="1"
                  min={F.falhas_recorrentes_limite.min}
                  max={F.falhas_recorrentes_limite.max}
                  defaultValue={config.falhas_recorrentes_limite}
                />
                <Numero
                  rotulo="Janela (dias)"
                  ajuda={`Quantos dias para trás contar as falhas. ${faixa(F.falhas_recorrentes_dias)}`}
                  name="falhas_recorrentes_dias"
                  step="1"
                  min={F.falhas_recorrentes_dias.min}
                  max={F.falhas_recorrentes_dias.max}
                  defaultValue={config.falhas_recorrentes_dias}
                />
              </div>
            </Cartao>
          </fieldset>

          <ErroForm state={state} />
          {podeEditar ? (
            <div className="flex justify-end">
              <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
            </div>
          ) : (
            <SomenteLeitura />
          )}
        </form>
      )}
    </div>
  );
}
