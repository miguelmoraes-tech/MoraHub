"use client";

import { useActionState } from "react";
import { StatusChip } from "@/components/status-chip";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { Aviso, BotaoPrimario, Cartao, Entrada, ErroForm, Seletor } from "@/components/impressao-3d/campos";
import { salvarIntegracao } from "@/app/(dashboard)/impressao-3d/integracoes/actions";
import {
  INTEGRACAO_INFO, MENSAGEM_NAO_CONECTADA, STATUS_INTEGRACAO_ROTULO, TIPOS_INTEGRACAO,
  type Integracao, type StatusIntegracao, type TipoIntegracao,
} from "@/lib/impressao-3d/integracoes";
import { formatDataHora } from "@/lib/impressao-3d/numeros";

const TOM_STATUS: Record<StatusIntegracao, "zinc" | "emerald" | "rose"> = {
  nao_configurada: "zinc",
  configurada: "emerald",
  erro: "rose",
};

function CartaoIntegracao({
  tipo, integracao, podeEditar,
}: {
  tipo: TipoIntegracao;
  integracao: Integracao | undefined;
  podeEditar: boolean;
}) {
  const info = INTEGRACAO_INFO[tipo];
  const [state, formAction, pendente] = useActionState(salvarIntegracao, undefined);
  useActionToast(state, { success: `${info.nome}: configuração salva.` });
  const status: StatusIntegracao = integracao?.status ?? "nao_configurada";

  return (
    <Cartao titulo={info.nome} acoes={<StatusChip tone={TOM_STATUS[status]}>{STATUS_INTEGRACAO_ROTULO[status]}</StatusChip>}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">{info.descricao}</p>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-400">O que vai habilitar</p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-500">
            {info.habilita.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>

        {status === "nao_configurada" && <Aviso>{MENSAGEM_NAO_CONECTADA}.</Aviso>}
        {status === "erro" && (
          <Aviso tom="erro">{integracao?.ultimo_erro ?? "O servidor registrou um erro nesta integração."}</Aviso>
        )}

        {/* Estado informado pelo servidor: somente leitura. Nada aqui conecta ou testa o serviço. */}
        <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Credencial no servidor</dt>
            <dd className="text-zinc-300">{integracao?.segredo_configurado ? "Configurada" : "Não configurada"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Última verificação</dt>
            <dd className="text-zinc-300">
              {integracao?.ultima_verificacao ? formatDataHora(integracao.ultima_verificacao) : "Nunca verificada"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Marcada como ativa</dt>
            <dd className="text-zinc-300">{integracao?.ativo ? "Sim" : "Não"}</dd>
          </div>
        </dl>

        {podeEditar ? (
          <form action={formAction} className="space-y-3 border-t border-zinc-800 pt-4">
            <input type="hidden" name="tipo" value={tipo} />
            <p className="text-xs font-medium text-zinc-400">Dados de identificação (não secretos)</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {info.campos.map((c) =>
                c.tipo === "opcoes" ? (
                  <Seletor key={c.chave} rotulo={c.rotulo} ajuda={c.ajuda} name={c.chave} defaultValue={integracao?.config[c.chave] ?? ""}>
                    <option value="">Não informado</option>
                    {c.opcoes?.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                    ))}
                  </Seletor>
                ) : (
                  <Entrada
                    key={c.chave}
                    rotulo={c.rotulo}
                    ajuda={c.ajuda}
                    name={c.chave}
                    type={c.tipo === "url" ? "url" : "text"}
                    inputMode={c.tipo === "cep" ? "numeric" : undefined}
                    maxLength={c.tipo === "cep" ? 9 : (c.max ?? 120)}
                    autoComplete="off"
                    defaultValue={integracao?.config[c.chave] ?? ""}
                  />
                )
              )}
            </div>
            <label className="flex items-start gap-2 text-xs text-zinc-300">
              <input type="checkbox" name="ativo" defaultChecked={integracao?.ativo ?? false} className="mt-0.5" />
              <span>
                Marcar como ativa
                <span className="block text-[11px] text-zinc-500">
                  Só registra a intenção de uso. Não conecta nada: a conexão depende do servidor.
                </span>
              </span>
            </label>
            <p className="text-[11px] text-zinc-600">
              Não digite tokens, senhas nem chaves de API aqui: elas ficam no servidor e nunca neste formulário.
            </p>
            <ErroForm state={state} />
            <div className="flex justify-end">
              <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
            </div>
          </form>
        ) : (
          <p className="border-t border-zinc-800 pt-3 text-xs text-zinc-500">
            Só o fundador ou cofundador altera a configuração. Você vê o estado da integração.
          </p>
        )}
      </div>
    </Cartao>
  );
}

export function IntegracoesBoard({
  integracoes, erro, podeEditar,
}: {
  integracoes: Integracao[];
  erro: string | null;
  podeEditar: boolean;
}) {
  const porTipo = new Map(integracoes.map((i) => [i.tipo, i]));
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Integrações</h1>
        <p className="text-sm text-zinc-500">
          Estrutura para ligar serviços externos. Nenhuma integração está conectada: cada uma depende de credenciais
          externas e de configuração no servidor.
        </p>
      </div>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div className="space-y-5">
        {TIPOS_INTEGRACAO.map((t) => (
          <CartaoIntegracao key={`${t}-${porTipo.get(t)?.ativo}-${JSON.stringify(porTipo.get(t)?.config ?? {})}`} tipo={t} integracao={porTipo.get(t)} podeEditar={podeEditar} />
        ))}
      </div>
    </div>
  );
}
