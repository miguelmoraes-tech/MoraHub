"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Factory, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { useToast } from "@/components/toast";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  AreaTexto, Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { TOM_PRIORIDADE } from "@/components/impressao-3d/pedidos-board";
import {
  atualizarTrabalho, cancelarProducao, concluirProducao, criarTrabalho, excluirTrabalho, iniciarProducao,
  registrarFalhaProducao, type ResultadoOperacao,
} from "@/app/(dashboard)/impressao-3d/producao/actions";
import {
  PRIORIDADE_ROTULO, QUALIDADE_ROTULO, STATUS_PRODUCAO_ROTULO, TIPO_DEFEITO_ROTULO, TIPOS_DEFEITO,
  type StatusProducao, type Trabalho,
} from "@/lib/impressao-3d/tipos-operacao";
import { STATUS_IMPRESSORA_ROTULO, type StatusImpressora } from "@/lib/impressao-3d/tipos";
import type { OpcaoMaterial, OpcaoPedido, OpcaoProduto, Opcoes } from "@/lib/impressao-3d/opcoes";
import {
  ordenarFila, produtividadePorImpressora, trabalhoEstruturalEditavel,
} from "@/lib/impressao-3d/regras-operacao";
import { formatDataHora, formatGramas, formatHoras, formatNumero } from "@/lib/impressao-3d/numeros";
import { formatDate } from "@/lib/format";
import { abaInicial } from "@/lib/modulos/preferencias";

export interface ImpressoraProducao {
  id: string;
  nome: string;
  status: StatusImpressora;
  ativo: boolean;
  horas_uso: number;
}

const TOM_STATUS_PRODUCAO: Record<StatusProducao, ChipTone> = {
  fila: "zinc",
  imprimindo: "amber",
  concluida: "emerald",
  falhou: "rose",
  cancelada: "zinc",
};

const ABAS = ["fila", "imprimindo", "concluida", "falhou", "cancelada"] as const;

function CamposTrabalho({
  item,
  impressoras,
  materiais,
  produtos,
  limitado,
}: {
  item?: Trabalho;
  impressoras: ImpressoraProducao[] | null;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  limitado: boolean;
}) {
  const [produtoId, setProdutoId] = useState(item?.produto_id ?? "");
  const variacoes = produtos.itens.find((p) => p.id === produtoId)?.variacoes ?? [];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {!limitado && (
        <>
          <Entrada rotulo="Descrição *" name="descricao" required defaultValue={item?.descricao} className="col-span-2" />
          <Entrada rotulo="Quantidade *" name="quantidade" type="number" min="1" step="1" required defaultValue={item?.quantidade ?? 1} />
          {produtos.acessivel ? (
            <>
              <Seletor rotulo="Produto" name="produto_id" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                <option value="">Sem produto</option>
                {produtos.itens.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </Seletor>
              <Seletor rotulo="Variação" name="variacao_id" defaultValue={item?.variacao_id ?? ""} disabled={variacoes.length === 0}>
                <option value="">Sem variação</option>
                {variacoes.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </Seletor>
            </>
          ) : (
            <>
              <input type="hidden" name="produto_id" value={item?.produto_id ?? ""} />
              <input type="hidden" name="variacao_id" value={item?.variacao_id ?? ""} />
            </>
          )}
          <input type="hidden" name="arquivo_id" value={item?.arquivo_id ?? ""} />
          {impressoras ? (
            <Seletor rotulo="Impressora" name="impressora_id" defaultValue={item?.impressora_id ?? ""}>
              <option value="">Escolher ao iniciar</option>
              {impressoras.filter((i) => i.ativo || i.id === item?.impressora_id).map((i) => (
                <option key={i.id} value={i.id}>{i.nome}</option>
              ))}
            </Seletor>
          ) : (
            <input type="hidden" name="impressora_id" value={item?.impressora_id ?? ""} />
          )}
          {materiais.acessivel ? (
            <Seletor rotulo="Material" name="material_id" defaultValue={item?.material_id ?? ""}>
              <option value="">Informar ao concluir</option>
              {materiais.itens.map((m) => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
            </Seletor>
          ) : (
            <input type="hidden" name="material_id" value={item?.material_id ?? ""} />
          )}
        </>
      )}
      <Seletor rotulo="Prioridade" name="prioridade" defaultValue={item?.prioridade ?? "normal"}>
        {Object.entries(PRIORIDADE_ROTULO).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </Seletor>
      <Entrada rotulo="Prazo" name="prazo" type="date" defaultValue={item?.prazo ?? ""} />
      {!limitado && (
        <>
          <Numero rotulo="Horas estimadas" name="horas_estimadas" defaultValue={item?.horas_estimadas ?? ""} />
          <Numero rotulo="Peso estimado (g)" name="peso_estimado_g" defaultValue={item?.peso_estimado_g ?? ""} />
        </>
      )}
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
      {limitado && (
        <p className="col-span-2 text-[11px] text-zinc-600 sm:col-span-4">
          Depois de sair da fila, só prioridade, prazo e observações podem mudar.
        </p>
      )}
    </div>
  );
}

function FormTrabalho({
  item,
  impressoras,
  materiais,
  produtos,
  aoFechar,
}: {
  item?: Trabalho;
  impressoras: ImpressoraProducao[] | null;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  aoFechar: () => void;
}) {
  const acao = item ? atualizarTrabalho.bind(null, item.id) : criarTrabalho;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  const limitado = !!item && !trabalhoEstruturalEditavel(item.status);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      {!item && (
        <p className="text-[11px] text-zinc-500">
          Trabalho avulso (produção para estoque). Trabalhos de pedido são criados por &quot;Gerar produção&quot; no pedido.
        </p>
      )}
      <CamposTrabalho item={item} impressoras={impressoras} materiais={materiais} produtos={produtos} limitado={limitado} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : item ? "Salvar" : "Criar trabalho"}</BotaoPrimario>
      </div>
    </form>
  );
}

type Executor = (fn: () => Promise<ResultadoOperacao>, aoOk: () => void) => void;

function FormIniciar({
  trabalho,
  impressoras,
  executar,
  pendente,
  aoFechar,
}: {
  trabalho: Trabalho;
  impressoras: ImpressoraProducao[] | null;
  executar: Executor;
  pendente: boolean;
  aoFechar: () => void;
}) {
  const livres = (impressoras ?? []).filter((i) => i.ativo && i.status === "disponivel");
  const [impressoraId, setImpressoraId] = useState(
    livres.some((i) => i.id === trabalho.impressora_id) ? (trabalho.impressora_id ?? "") : (livres[0]?.id ?? "")
  );
  return (
    <div className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <p className="text-sm font-medium text-zinc-100">Iniciar trabalho #{trabalho.numero}</p>
      {impressoras === null ? (
        <Aviso>Sem acesso a Impressoras: o trabalho vai para a impressora cadastrada nele (se houver). A RPC confirma se ela está disponível.</Aviso>
      ) : livres.length === 0 ? (
        <Aviso tom="alerta">Nenhuma impressora disponível agora. Libere uma impressora (ocupada ou em manutenção) em Impressoras.</Aviso>
      ) : (
        <Seletor rotulo="Impressora disponível *" value={impressoraId} onChange={(e) => setImpressoraId(e.target.value)} className="max-w-sm">
          {livres.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </Seletor>
      )}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario
          type="button"
          pendente={pendente}
          disabled={impressoras !== null && livres.length === 0}
          onClick={() => executar(() => iniciarProducao(trabalho.id, impressoraId || null), aoFechar)}
        >
          {pendente ? "Iniciando..." : "Iniciar impressão"}
        </BotaoPrimario>
      </div>
    </div>
  );
}

function FormConcluir({
  trabalho,
  materiais,
  executar,
  pendente,
  aoFechar,
}: {
  trabalho: Trabalho;
  materiais: Opcoes<OpcaoMaterial>;
  executar: Executor;
  pendente: boolean;
  aoFechar: () => void;
}) {
  return (
    <form
      action={(fd) => executar(() => concluirProducao(trabalho.id, fd), aoFechar)}
      className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3"
    >
      <p className="text-sm font-medium text-zinc-100">Concluir trabalho #{trabalho.numero}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Peso real consumido (g) *" name="peso_real_g" required ajuda="Peso total do trabalho (todas as unidades), incluindo suportes e purga." />
        <Numero rotulo="Horas reais *" name="horas_reais" required />
        {materiais.acessivel ? (
          <Seletor rotulo="Material" name="material_id" defaultValue={trabalho.material_id ?? ""} className="col-span-2">
            <option value="">{trabalho.material_id ? "Usar o material do trabalho" : "Selecione..."}</option>
            {materiais.itens.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </Seletor>
        ) : (
          <input type="hidden" name="material_id" value={trabalho.material_id ?? ""} />
        )}
        <Entrada rotulo="Observação" name="observacao" className="col-span-2 sm:col-span-4" />
      </div>
      <p className="text-[11px] text-zinc-600">
        Ao concluir, o peso real é baixado do estoque do material, as horas são somadas à impressora e ela é liberada. Isto não pode ser feito duas vezes.
      </p>
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Concluindo..." : "Concluir e baixar estoque"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormFalha({
  trabalho,
  executar,
  pendente,
  aoFechar,
}: {
  trabalho: Trabalho;
  executar: Executor;
  pendente: boolean;
  aoFechar: () => void;
}) {
  const jaConcluido = trabalho.status === "concluida";
  return (
    <form
      action={(fd) => executar(() => registrarFalhaProducao(trabalho.id, fd), aoFechar)}
      className="space-y-3 rounded-lg border border-rose-500/30 bg-zinc-950/60 p-3"
    >
      <p className="text-sm font-medium text-zinc-100">Registrar falha no trabalho #{trabalho.numero}</p>
      <Aviso tom={jaConcluido ? "info" : "alerta"}>
        {jaConcluido
          ? "Trabalho já concluído: o estoque NÃO é baixado de novo (o consumo já saiu na conclusão). Informar quantidade afetada menor que a do trabalho mantém o trabalho concluído (falha parcial)."
          : "Trabalho imprimindo: o material perdido é baixado do estoque e o trabalho passa a \"Falhou\"."}
      </Aviso>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor rotulo="Tipo de defeito *" name="tipo_defeito" required defaultValue="" className="col-span-2">
          <option value="" disabled>Selecione...</option>
          {TIPOS_DEFEITO.map((t) => (
            <option key={t} value={t}>{TIPO_DEFEITO_ROTULO[t]}</option>
          ))}
        </Seletor>
        <Numero rotulo="Peso perdido (g) *" name="peso_perdido_g" required />
        <Numero rotulo="Horas perdidas *" name="horas_perdidas" required />
        {trabalho.quantidade > 1 && (
          <Entrada
            rotulo={`Quantidade afetada (de ${trabalho.quantidade})`}
            name="quantidade_afetada"
            type="number"
            min="1"
            step="1"
            ajuda="Vazio = o trabalho todo."
          />
        )}
        <AreaTexto rotulo="Descrição" name="descricao" className="col-span-2 sm:col-span-4" />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" name="reimprimir" /> Criar reimpressão na fila
      </label>
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Registrando..." : "Registrar falha"}</BotaoPrimario>
      </div>
    </form>
  );
}

function FormCancelar({
  trabalho,
  aoFechar,
}: {
  trabalho: Trabalho;
  aoFechar: () => void;
}) {
  const { executar, pendente, ultimoErro } = useAcao();
  const [motivo, setMotivo] = useState("");
  return (
    <div className="space-y-3 rounded-lg border border-rose-500/30 bg-zinc-950/60 p-3">
      <p className="text-sm font-medium text-zinc-100">Cancelar trabalho #{trabalho.numero}</p>
      <AreaTexto rotulo="Motivo *" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      {ultimoErro && <p className="text-xs text-rose-400">{ultimoErro}</p>}
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Voltar</BotaoTexto>
        <BotaoPrimario
          type="button"
          pendente={pendente}
          onClick={() => executar(() => cancelarProducao(trabalho.id, motivo), { sucesso: "Trabalho cancelado.", aoConcluir: aoFechar })}
        >
          Cancelar trabalho
        </BotaoPrimario>
      </div>
    </div>
  );
}

function CartaoTrabalho({
  trabalho,
  podeEditar,
  impressoras,
  materiais,
  produtos,
  pedidos,
  hoje,
  executar,
  pendente,
}: {
  trabalho: Trabalho;
  podeEditar: boolean;
  impressoras: ImpressoraProducao[] | null;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  pedidos: Opcoes<OpcaoPedido>;
  hoje: string;
  executar: Executor;
  pendente: boolean;
}) {
  type Modo = "nenhum" | "editar" | "iniciar" | "concluir" | "falha" | "cancelar";
  const [modo, setModo] = useState<Modo>("nenhum");
  const { executar: executarSimples, pendente: pendenteSimples } = useAcao();
  const fechar = () => setModo("nenhum");
  const impressora = impressoras?.find((i) => i.id === trabalho.impressora_id);
  const material = materiais.itens.find((m) => m.id === trabalho.material_id);
  const pedido = pedidos.itens.find((p) => p.id === trabalho.pedido_id);
  const vencido = !!trabalho.prazo && trabalho.prazo < hoje && (trabalho.status === "fila" || trabalho.status === "imprimindo");
  const emAndamento = trabalho.status === "fila" || trabalho.status === "imprimindo";

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
              <span className="text-zinc-500">#{trabalho.numero}</span> {trabalho.descricao} × {trabalho.quantidade}
              <StatusChip tone={TOM_STATUS_PRODUCAO[trabalho.status]}>{STATUS_PRODUCAO_ROTULO[trabalho.status]}</StatusChip>
              {trabalho.prioridade !== "normal" && <StatusChip tone={TOM_PRIORIDADE[trabalho.prioridade]}>{PRIORIDADE_ROTULO[trabalho.prioridade]}</StatusChip>}
              {vencido && <StatusChip tone="rose">Prazo vencido</StatusChip>}
              {trabalho.status === "concluida" && (
                <StatusChip tone={trabalho.qualidade === "reprovada" ? "rose" : trabalho.qualidade === "aprovada" ? "emerald" : "amber"}>
                  Qualidade {QUALIDADE_ROTULO[trabalho.qualidade].toLowerCase()}
                </StatusChip>
              )}
              {trabalho.reimpressao_de && <StatusChip tone="copper">Reimpressão</StatusChip>}
            </p>
            <p className="text-xs text-zinc-500">
              {pedido ? (
                <>
                  Pedido{" "}
                  <Link href={`/impressao-3d/pedidos/${pedido.id}`} className="text-copper-400 hover:underline">#{pedido.numero}</Link>{" "}
                  ({pedido.cliente})
                </>
              ) : trabalho.pedido_id ? (
                "Vinculado a um pedido"
              ) : (
                "Avulso (estoque)"
              )}
              {trabalho.prazo && ` · prazo ${formatDate(trabalho.prazo)}`}
              {impressora && ` · ${impressora.nome}`}
              {material && ` · ${material.nome}`}
            </p>
            <p className="text-xs text-zinc-500">
              {trabalho.horas_estimadas !== null && `Estimado: ${formatHoras(trabalho.horas_estimadas)}`}
              {trabalho.peso_estimado_g !== null && `${trabalho.horas_estimadas !== null ? " · " : "Estimado: "}${formatGramas(trabalho.peso_estimado_g)}`}
              {trabalho.horas_reais !== null && ` · Real: ${formatHoras(trabalho.horas_reais)}`}
              {trabalho.peso_real_g !== null && ` · ${formatGramas(trabalho.peso_real_g)}`}
              {trabalho.iniciado_em && ` · iniciado ${formatDataHora(trabalho.iniciado_em)}`}
              {trabalho.concluido_em && ` · concluído ${formatDataHora(trabalho.concluido_em)}`}
            </p>
            {trabalho.observacoes && <p className="text-xs text-zinc-600">{trabalho.observacoes}</p>}
          </div>
          {podeEditar && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
              {trabalho.status === "fila" && <BotaoTexto onClick={() => setModo("iniciar")}>Iniciar</BotaoTexto>}
              {trabalho.status === "imprimindo" && <BotaoTexto onClick={() => setModo("concluir")}>Concluir</BotaoTexto>}
              {(trabalho.status === "imprimindo" || trabalho.status === "concluida") && (
                <BotaoTexto perigo onClick={() => setModo("falha")}>Registrar falha</BotaoTexto>
              )}
              {trabalho.status === "fila" && <BotaoTexto perigo onClick={() => setModo("cancelar")}>Cancelar</BotaoTexto>}
              {emAndamento && (
                <button type="button" aria-label="Editar trabalho" onClick={() => setModo("editar")} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {trabalho.status === "fila" && (
                <button
                  type="button"
                  disabled={pendenteSimples}
                  aria-label="Excluir trabalho"
                  onClick={() => executarSimples(() => excluirTrabalho(trabalho.id), { confirmar: `Excluir o trabalho #${trabalho.numero}?`, sucesso: "Trabalho excluído." })}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {modo === "editar" && (
        <FormTrabalho item={trabalho} impressoras={impressoras} materiais={materiais} produtos={produtos} aoFechar={fechar} />
      )}
      {modo === "iniciar" && <FormIniciar trabalho={trabalho} impressoras={impressoras} executar={executar} pendente={pendente} aoFechar={fechar} />}
      {modo === "concluir" && <FormConcluir trabalho={trabalho} materiais={materiais} executar={executar} pendente={pendente} aoFechar={fechar} />}
      {modo === "falha" && <FormFalha trabalho={trabalho} executar={executar} pendente={pendente} aoFechar={fechar} />}
      {modo === "cancelar" && <FormCancelar trabalho={trabalho} aoFechar={fechar} />}
    </div>
  );
}

function Produtividade({
  trabalhos,
  impressoras,
  truncado,
}: {
  trabalhos: Trabalho[];
  impressoras: ImpressoraProducao[] | null;
  truncado: boolean;
}) {
  const mapa = useMemo(() => produtividadePorImpressora(trabalhos), [trabalhos]);
  if (impressoras === null) {
    return <Aviso tom="alerta">Sem acesso a Impressoras: não é possível mostrar a produtividade por impressora.</Aviso>;
  }
  const linhas = impressoras.filter((i) => i.ativo || mapa.has(i.id));
  const temDados = [...mapa.values()].some((p) => p.concluidos + p.falhos > 0);
  return (
    <div className="space-y-3">
      <Aviso>
        Tudo aqui vem de trabalhos <strong>concluídos ou com falha</strong> e das horas de uso cadastradas. Impressora sem trabalho
        medido aparece com traço, nunca com número estimado. As &quot;horas de uso&quot; do cadastro podem ser maiores: incluem horas
        informadas à mão antes da produção.
        {truncado && " Só os trabalhos mais recentes foram carregados."}
      </Aviso>
      {!temDados ? (
        <Vazio>Ainda não há trabalhos concluídos ou com falha. A produtividade aparece conforme você conclui trabalhos.</Vazio>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-zinc-500">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Impressora</th>
              <th className="py-1.5 pr-3 font-medium">Status</th>
              <th className="py-1.5 pr-3 text-right font-medium">Horas de uso (cadastro)</th>
              <th className="py-1.5 pr-3 text-right font-medium">Concluídos</th>
              <th className="py-1.5 pr-3 text-right font-medium">Com falha</th>
              <th className="py-1.5 pr-3 text-right font-medium">Horas reais medidas</th>
              <th className="py-1.5 pr-3 text-right font-medium">Peso real</th>
              <th className="py-1.5 text-right font-medium">Concluídos por hora</th>
            </tr>
          </thead>
          <tbody className="text-zinc-300">
            {linhas.map((i) => {
              const p = mapa.get(i.id);
              return (
                <tr key={i.id} className="border-t border-zinc-800/70">
                  <td className="py-1.5 pr-3">{i.nome}</td>
                  <td className="py-1.5 pr-3">{STATUS_IMPRESSORA_ROTULO[i.status] ?? i.status}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatHoras(i.horas_uso)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p ? p.concluidos : "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p ? p.falhos : "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p && p.horasReais > 0 ? formatHoras(p.horasReais) : "—"}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{p && p.pesoRealG > 0 ? formatGramas(p.pesoRealG) : "—"}</td>
                  <td className="py-1.5 text-right tabular-nums">{p?.trabalhosPorHora != null ? formatNumero(p.trabalhosPorHora, 2) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProducaoBoard({
  trabalhos,
  truncado,
  impressoras,
  materiais,
  produtos,
  pedidos,
  podeEditar,
  hoje,
  abas,
}: {
  trabalhos: Trabalho[];
  truncado: boolean;
  /** null = sem acesso ao módulo Impressoras. */
  impressoras: ImpressoraProducao[] | null;
  materiais: Opcoes<OpcaoMaterial>;
  produtos: Opcoes<OpcaoProduto>;
  pedidos: Opcoes<OpcaoPedido>;
  podeEditar: boolean;
  hoje: string;
  /** Abas visíveis pela preferência de navegação (nunca vazia; ordem do registro). */
  abas: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendente, iniciar] = useTransition();
  const [aba, setAba] = useState<StatusProducao | "produtividade">(abaInicial(abas, "fila"));
  const [novo, setNovo] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);

  const executar: Executor = (fn, aoOk) => {
    iniciar(async () => {
      const r = await fn();
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(r.mensagem);
      setAvisos(r.avisos);
      aoOk();
      router.refresh();
    });
  };

  const porStatus = useMemo(() => {
    const m = new Map<StatusProducao, Trabalho[]>();
    for (const s of ABAS) m.set(s, []);
    for (const t of trabalhos) m.get(t.status)?.push(t);
    // Fila na ordem de produção; os demais, do mais recente ao mais antigo.
    m.set("fila", ordenarFila(m.get("fila") ?? []));
    return m;
  }, [trabalhos]);
  const lista = aba === "produtividade" ? [] : (porStatus.get(aba) ?? []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Produção</h1>
          <p className="text-sm text-zinc-500">
            {porStatus.get("fila")?.length ?? 0} na fila · {porStatus.get("imprimindo")?.length ?? 0} imprimindo
          </p>
        </div>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo trabalho avulso
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {truncado && aba !== "produtividade" && (
        <div className="mb-4">
          <Aviso tom="alerta">Mostrando só os trabalhos mais recentes (limite de {formatNumero(trabalhos.length, 0)}).</Aviso>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="mb-4 space-y-2">
          {avisos.map((a, i) => (
            <Aviso key={i} tom="alerta">{a}</Aviso>
          ))}
          <BotaoTexto onClick={() => setAvisos([])}>Dispensar avisos</BotaoTexto>
        </div>
      )}
      {novo && (
        <div className="mb-5">
          <FormTrabalho impressoras={impressoras} materiais={materiais} produtos={produtos} aoFechar={() => setNovo(false)} />
        </div>
      )}

      <div className="mb-6 inline-flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
        {[...ABAS, "produtividade" as const].filter((k) => abas.includes(k)).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${aba === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {k === "produtividade" ? "Produtividade" : `${STATUS_PRODUCAO_ROTULO[k]} (${porStatus.get(k)?.length ?? 0})`}
          </button>
        ))}
      </div>

      {aba === "produtividade" ? (
        <Cartao titulo="Produtividade por impressora" icone={<Factory className="h-4 w-4" />}>
          <Produtividade trabalhos={trabalhos} impressoras={impressoras} truncado={truncado} />
        </Cartao>
      ) : (
        <Cartao titulo={STATUS_PRODUCAO_ROTULO[aba]} icone={<Factory className="h-4 w-4" />}>
          {aba === "fila" && lista.length > 0 && (
            <p className="mb-3 text-[11px] text-zinc-600">Ordem da fila: prioridade (urgente, alta, normal, baixa), depois prazo (sem prazo por último), depois número.</p>
          )}
          {lista.length === 0 ? (
            <Vazio>
              {aba === "fila"
                ? "Fila vazia. Gere a produção de um pedido confirmado ou crie um trabalho avulso."
                : `Nenhum trabalho ${STATUS_PRODUCAO_ROTULO[aba].toLowerCase()}.`}
            </Vazio>
          ) : (
            <div className="space-y-2">
              {lista.map((t) => (
                <CartaoTrabalho
                  key={t.id}
                  trabalho={t}
                  podeEditar={podeEditar}
                  impressoras={impressoras}
                  materiais={materiais}
                  produtos={produtos}
                  pedidos={pedidos}
                  hoje={hoje}
                  executar={executar}
                  pendente={pendente}
                />
              ))}
            </div>
          )}
        </Cartao>
      )}
    </div>
  );
}
