"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { AlertTriangle, Pencil, Plus, Printer, Trash2, Wrench, Archive, ArchiveRestore } from "lucide-react";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, AreaTexto, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero,
  Seletor, SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  atualizarImpressora, atualizarPecaDesgaste, alternarImpressoraAtiva, criarImpressora,
  criarPecaDesgaste, excluirImpressora, excluirManutencao, excluirPecaDesgaste, registrarManutencao,
} from "@/app/(dashboard)/impressao-3d/impressoras/actions";
import {
  CATEGORIA_DESGASTE_ROTULO, INTEGRACAO_ROTULO, STATUS_IMPRESSORA_ROTULO, TECNOLOGIA_ROTULO,
  TIPO_MANUTENCAO_ROTULO,
  type Impressora, type Manutencao, type PecaDesgaste, type StatusImpressora,
} from "@/lib/impressao-3d/tipos";
import {
  depreciacaoPorHora, desgastePorHora, horasParaManutencao, manutencaoVencida, pecaVencida,
} from "@/lib/impressao-3d/regras";
import { formatHoras, formatMoeda, formatNumero } from "@/lib/impressao-3d/numeros";
import { custoHoraImpressora, kwParaWatts, wattsParaKw } from "@/lib/impressao-3d/calculadora-rapida";
import { hojeSaoPaulo } from "@/lib/impressao-3d/datas";
import { formatDate } from "@/lib/format";
import { abaInicial } from "@/lib/modulos/preferencias";

const TOM_STATUS: Record<StatusImpressora, ChipTone> = {
  disponivel: "emerald",
  imprimindo: "sky",
  manutencao: "amber",
  inativa: "zinc",
};

function CamposImpressora({ item, tarifaKwh }: { item?: Impressora; tarifaKwh: number | null }) {
  const [aquisicao, setAquisicao] = useState(item?.valor_aquisicao ?? 0);
  const [residual, setResidual] = useState(item?.valor_residual ?? 0);
  const [vida, setVida] = useState(item?.vida_util_horas ?? 0);
  const [watts, setWatts] = useState(item ? kwParaWatts(item.potencia_media_kw) : 0);
  const custoHora = custoHoraImpressora({
    aquisicao, residual, vidaUtilHoras: vida, watts, tarifaKwh: tarifaKwh ?? 0,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2" placeholder="Ex.: Ender 3 V2" />
        <Numero
          rotulo="Preço pago (R$)"
          name="valor_aquisicao"
          defaultValue={item?.valor_aquisicao ?? ""}
          onChange={(e) => setAquisicao(Number(e.target.value) || 0)}
          ajuda="Quanto custou a impressora (nota de compra)."
        />
        <Numero
          rotulo="Vida útil estimada (horas)"
          name="vida_util_horas"
          defaultValue={item?.vida_util_horas ?? ""}
          onChange={(e) => setVida(Number(e.target.value) || 0)}
          ajuda="Quantas horas de impressão ela deve aguentar. Uma estimativa comum: 5.000 h."
        />
        <Numero
          rotulo="Potência média (watts)"
          step="1"
          value={watts || ""}
          onChange={(e) => setWatts(Number(e.target.value) || 0)}
          ajuda="Consumo médio imprimindo (ficha técnica ou medidor de tomada). Ex.: 120 W."
        />
        {/* O banco guarda em kW: a tela pede watts e grava W ÷ 1000. */}
        <input type="hidden" name="potencia_media_kw" value={wattsParaKw(watts)} />
        <div className="col-span-2 flex flex-col justify-end sm:col-span-3">
          <p className="text-xs font-medium text-zinc-400">Custo por hora de impressão</p>
          <p className="text-sm text-zinc-200">
            Depreciação {formatMoeda(custoHora.depreciacao, 4)}/h
            {tarifaKwh != null && <> · Energia {formatMoeda(custoHora.energia, 4)}/h</>}
            {" "}<span className="text-[11px] text-amber-500">Estimado</span>
          </p>
          <p className="text-[11px] text-zinc-600">
            Depreciação = (preço pago − valor residual) ÷ vida útil.
            {tarifaKwh != null
              ? ` Energia = watts ÷ 1000 × tarifa (${formatMoeda(tarifaKwh, 4)}/kWh).`
              : " A energia usa a tarifa da calculadora de preço."}
          </p>
        </div>
      </div>

      <details className="rounded-lg border border-zinc-800">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
          Mais opções (marca, modelo, volume, bico, valor residual, manutenção, integração...)
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 p-3 sm:grid-cols-4">
          <Entrada rotulo="Marca" name="marca" defaultValue={item?.marca ?? ""} />
          <Entrada rotulo="Modelo" name="modelo" defaultValue={item?.modelo ?? ""} />
          <Seletor rotulo="Tecnologia" name="tecnologia" defaultValue={item?.tecnologia ?? "fdm"}>
            {Object.entries(TECNOLOGIA_ROTULO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Seletor>
          <Seletor rotulo="Status" name="status" defaultValue={item?.status ?? "disponivel"}>
            {Object.entries(STATUS_IMPRESSORA_ROTULO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Seletor>
          <Numero rotulo="Volume X (mm)" name="volume_x_mm" defaultValue={item?.volume_x_mm ?? ""} />
          <Numero rotulo="Volume Y (mm)" name="volume_y_mm" defaultValue={item?.volume_y_mm ?? ""} />
          <Numero rotulo="Volume Z (mm)" name="volume_z_mm" defaultValue={item?.volume_z_mm ?? ""} />
          <Numero rotulo="Bico (mm)" name="bico_mm" defaultValue={item?.bico_mm ?? ""} />
          <Numero
            rotulo="Valor residual (R$)"
            name="valor_residual"
            defaultValue={item?.valor_residual ?? ""}
            onChange={(e) => setResidual(Number(e.target.value) || 0)}
            ajuda="Quanto ela ainda vale no fim da vida útil. Não pode passar do preço pago."
          />
          <Entrada rotulo="Data de aquisição" name="data_aquisicao" type="date" defaultValue={item?.data_aquisicao ?? ""} />
          <Numero
            rotulo="Horas de uso"
            name="horas_uso"
            defaultValue={item?.horas_uso ?? ""}
            ajuda="Informado à mão. A produção real (Etapa B) passará a alimentar este número."
          />
          <Numero rotulo="Manutenção (R$/hora)" name="manutencao_hora" defaultValue={item?.manutencao_hora ?? ""} />
          <Numero rotulo="Manutenção (R$/ciclo)" name="manutencao_ciclo" defaultValue={item?.manutencao_ciclo ?? ""} />
          <Numero
            rotulo="Intervalo de manutenção (h)"
            name="intervalo_manutencao_horas"
            defaultValue={item?.intervalo_manutencao_horas ?? ""}
            ajuda="Gera o alerta quando as horas desde a última manutenção chegam a este valor."
          />
          <Numero
            rotulo="Horas na última manutenção"
            name="horas_ultima_manutencao"
            defaultValue={item?.horas_ultima_manutencao ?? ""}
          />
          <Seletor rotulo="Integração (cadastro)" name="integracao_tipo" defaultValue={item?.integracao_tipo ?? ""}>
            <option value="">Nenhuma</option>
            {Object.entries(INTEGRACAO_ROTULO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Seletor>
          <Entrada
            rotulo="Endereço da integração"
            name="integracao_url"
            defaultValue={item?.integracao_url ?? ""}
            className="col-span-2"
            ajuda="Só o endereço, para consulta. Não guarde token nem senha aqui."
          />
          <AreaTexto rotulo="Observações" name="observacoes" defaultValue={item?.observacoes ?? ""} className="col-span-2 sm:col-span-4" />
        </div>
      </details>
    </div>
  );
}

function FormImpressora({
  item,
  tarifaKwh,
  aoFechar,
}: {
  item?: Impressora;
  tarifaKwh: number | null;
  aoFechar: () => void;
}) {
  const acao = item ? atualizarImpressora.bind(null, item.id) : criarImpressora;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposImpressora item={item} tarifaKwh={tarifaKwh} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function CamposPeca({ item }: { item?: PecaDesgaste }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2 sm:col-span-1" />
      <Seletor rotulo="Categoria" name="categoria" defaultValue={item?.categoria ?? "outro"}>
        {Object.entries(CATEGORIA_DESGASTE_ROTULO).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Seletor>
      <Numero rotulo="Custo (R$) *" name="custo" required defaultValue={item?.custo ?? ""} />
      <Numero rotulo="Vida útil (h) *" name="vida_util_horas" required min="0.01" defaultValue={item?.vida_util_horas ?? ""} />
      <Numero rotulo="Horas na última troca" name="horas_ultima_troca" defaultValue={item?.horas_ultima_troca ?? ""} />
    </div>
  );
}

function FormPeca({ impressoraId, item, aoFechar }: { impressoraId: string; item?: PecaDesgaste; aoFechar: () => void }) {
  const acao = item ? atualizarPecaDesgaste.bind(null, item.id) : criarPecaDesgaste.bind(null, impressoraId);
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposPeca item={item} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function AbaPecas({ impressora, pecas, podeEditar }: { impressora: Impressora; pecas: PecaDesgaste[]; podeEditar: boolean }) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const { executar, pendente } = useAcao();
  const porHora = desgastePorHora(pecas);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          Custo de desgaste por hora:{" "}
          <span className="font-medium text-zinc-200">{formatMoeda(porHora, 4)}/h</span>{" "}
          <span className="text-[11px] text-amber-500">Estimado</span> · soma de custo ÷ vida útil de cada peça, somada à manutenção por hora no cálculo.
        </p>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Nova peça
          </BotaoNovo>
        )}
      </div>
      {novo && <FormPeca impressoraId={impressora.id} aoFechar={() => setNovo(false)} />}
      {pecas.length === 0 && !novo ? (
        <Vazio>Nenhuma peça de desgaste cadastrada (bico, correia, mesa...).</Vazio>
      ) : (
        <div className="space-y-2">
          {pecas.map((p) =>
            editando === p.id ? (
              <FormPeca key={p.id} impressoraId={impressora.id} item={p} aoFechar={() => setEditando(null)} />
            ) : (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {p.nome}
                    <StatusChip tone="copper">{CATEGORIA_DESGASTE_ROTULO[p.categoria]}</StatusChip>
                    {pecaVencida(p, impressora.horas_uso) && <StatusChip tone="rose">Troca vencida</StatusChip>}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatMoeda(p.custo)} · vida útil {formatHoras(p.vida_util_horas)} · última troca em{" "}
                    {formatHoras(p.horas_ultima_troca)} de uso · {formatMoeda(p.custo / p.vida_util_horas, 4)}/h
                  </p>
                </div>
                {podeEditar && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => setEditando(p.id)} aria-label="Editar peça" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={pendente}
                      aria-label="Excluir peça"
                      onClick={() => executar(() => excluirPecaDesgaste(p.id), { confirmar: `Excluir a peça "${p.nome}"?` })}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function FormManutencao({ impressora, aoFechar }: { impressora: Impressora; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(registrarManutencao.bind(null, impressora.id), undefined);
  const [tipo, setTipo] = useState("preventiva");
  const formRef = useRef<HTMLFormElement>(null);
  useActionSuccess(state, aoFechar);
  return (
    <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Seletor rotulo="Tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {Object.entries(TIPO_MANUTENCAO_ROTULO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Seletor>
        <Entrada rotulo="Data" name="data" type="date" defaultValue={hojeSaoPaulo()} />
        <Numero rotulo="Custo (R$)" name="custo" defaultValue="" />
        <Numero
          rotulo="Horas de uso no momento"
          name="horas_uso_no_momento"
          placeholder={formatNumero(impressora.horas_uso, 1)}
          ajuda="Vazio = horas de uso atuais da impressora."
        />
        <Entrada rotulo="Descrição *" name="descricao" required className="col-span-2 sm:col-span-4" />
      </div>
      {tipo === "preventiva" && (
        <p className="text-[11px] text-zinc-500">
          Manutenção preventiva atualiza as horas da última manutenção e zera o alerta.
        </p>
      )}
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Registrar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function AbaManutencoes({ impressora, manutencoes, podeEditar }: { impressora: Impressora; manutencoes: Manutencao[]; podeEditar: boolean }) {
  const [novo, setNovo] = useState(false);
  const { executar, pendente } = useAcao();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">Histórico de manutenções desta impressora.</p>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Registrar manutenção
          </BotaoNovo>
        )}
      </div>
      {novo && <FormManutencao impressora={impressora} aoFechar={() => setNovo(false)} />}
      {manutencoes.length === 0 && !novo ? (
        <Vazio>Nenhuma manutenção registrada.</Vazio>
      ) : (
        <div className="space-y-2">
          {manutencoes.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                  {m.descricao}
                  <StatusChip tone={m.tipo === "preventiva" ? "emerald" : "amber"}>{TIPO_MANUTENCAO_ROTULO[m.tipo]}</StatusChip>
                </p>
                <p className="text-xs text-zinc-500">
                  {formatDate(m.data)}
                  {m.horas_uso_no_momento != null && ` · com ${formatHoras(m.horas_uso_no_momento)} de uso`}
                  {m.custo > 0 && ` · ${formatMoeda(m.custo)}`}
                </p>
              </div>
              {podeEditar && (
                <button
                  type="button"
                  disabled={pendente}
                  aria-label="Excluir manutenção"
                  onClick={() => executar(() => excluirManutencao(m.id), { confirmar: "Excluir este registro de manutenção?" })}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Aba = "dados" | "pecas" | "manutencoes";

/** Trabalho em andamento numa impressora (só de quem tem acesso a Produção). */
export interface TrabalhoAtual {
  numero: number;
  descricao: string;
}

function Linha({
  item,
  pecas,
  manutencoes,
  podeEditar,
  trabalhoAtual,
  abas,
  tarifaKwh,
}: {
  tarifaKwh: number | null;
  item: Impressora;
  pecas: PecaDesgaste[];
  manutencoes: Manutencao[];
  podeEditar: boolean;
  abas: string[];
  trabalhoAtual: TrabalhoAtual | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>(abaInicial(abas, "dados"));
  const { executar, pendente } = useAcao();
  const vencida = manutencaoVencida(item);
  const faltam = horasParaManutencao(item);
  const deprec = depreciacaoPorHora(item.valor_aquisicao, item.valor_residual, item.vida_util_horas);

  return (
    <div className="rounded-lg border border-zinc-800/80">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
            {item.nome}
            <StatusChip tone={TOM_STATUS[item.status]}>{STATUS_IMPRESSORA_ROTULO[item.status]}</StatusChip>
            <StatusChip tone="copper">{TECNOLOGIA_ROTULO[item.tecnologia]}</StatusChip>
            {!item.ativo && <StatusChip tone="zinc">Arquivada</StatusChip>}
            {vencida && (
              <StatusChip tone="rose">
                <AlertTriangle className="h-3 w-3" /> Manutenção vencida
              </StatusChip>
            )}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {[item.marca, item.modelo].filter(Boolean).join(" ") || "Sem marca/modelo"} · {formatHoras(item.horas_uso)} de uso
            {faltam != null && !vencida && ` · próxima manutenção em ${formatHoras(faltam)}`}
            {faltam != null && vencida && ` · ${formatHoras(Math.abs(faltam))} além do intervalo`}
            {deprec > 0 && ` · depreciação ${formatMoeda(deprec, 4)}/h (estimado)`}
          </p>
          {item.status === "imprimindo" && (
            <p className="truncate text-xs text-amber-400">
              {trabalhoAtual ? `Ocupada: trabalho #${trabalhoAtual.numero} · ${trabalhoAtual.descricao}` : "Ocupada: imprimindo."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BotaoTexto onClick={() => setAberto((v) => !v)}>{aberto ? "Fechar" : "Detalhes"}</BotaoTexto>
          {podeEditar && (
            <>
              <button
                type="button"
                disabled={pendente}
                aria-label={item.ativo ? "Arquivar impressora" : "Reativar impressora"}
                title={item.ativo ? "Arquivar" : "Reativar"}
                onClick={() => executar(() => alternarImpressoraAtiva(item.id, !item.ativo), { sucesso: item.ativo ? "Impressora arquivada." : "Impressora reativada." })}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
              >
                {item.ativo ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                disabled={pendente}
                aria-label="Excluir impressora"
                onClick={() => executar(() => excluirImpressora(item.id), { confirmar: `Excluir a impressora "${item.nome}" e suas peças e manutenções?`, sucesso: "Impressora excluída." })}
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      {aberto && (
        <div className="space-y-3 border-t border-zinc-800/80 p-3">
          <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
            {([
              ["dados", "Dados"],
              ["pecas", `Peças de desgaste (${pecas.length})`],
              ["manutencoes", `Manutenções (${manutencoes.length})`],
            ] as [Aba, string][]).filter(([k]) => abas.includes(k)).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setAba(k)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${aba === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {aba === "dados" &&
            (podeEditar ? (
              <FormImpressora item={item} tarifaKwh={tarifaKwh} aoFechar={() => setAberto(false)} />
            ) : (
              <p className="text-xs text-zinc-500">Somente leitura: peça edição ao administrador para alterar os dados.</p>
            ))}
          {aba === "pecas" && <AbaPecas impressora={item} pecas={pecas} podeEditar={podeEditar} />}
          {aba === "manutencoes" && <AbaManutencoes impressora={item} manutencoes={manutencoes} podeEditar={podeEditar} />}
        </div>
      )}
    </div>
  );
}

function NovaImpressora({ tarifaKwh }: { tarifaKwh: number | null }) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <BotaoNovo onClick={() => setAberto(true)}>
        <Plus className="h-4 w-4" /> Nova impressora
      </BotaoNovo>
    );
  }
  return <FormImpressora tarifaKwh={tarifaKwh} aoFechar={() => setAberto(false)} />;
}

export function ImpressorasBoard({
  impressoras,
  pecas,
  manutencoes,
  podeEditar,
  trabalhosAtuais,
  abas,
  tarifaKwh,
}: {
  /** Tarifa de energia da empresa (R$/kWh) para o custo/hora ao vivo; null sem acesso a Precificação. */
  tarifaKwh: number | null;
  impressoras: Impressora[];
  pecas: PecaDesgaste[];
  manutencoes: Manutencao[];
  podeEditar: boolean;
  /** impressora_id → trabalho em andamento; vazio se ninguém está imprimindo. */
  trabalhosAtuais: Record<string, TrabalhoAtual>;
  /** Abas visíveis pela preferência de navegação (nunca vazia; ordem do registro). */
  abas: string[];
}) {
  const [statusFiltro, setStatusFiltro] = useState("");
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);

  const filtradas = useMemo(
    () =>
      impressoras.filter(
        (i) =>
          (mostrarArquivadas || i.ativo) &&
          (!statusFiltro || STATUS_IMPRESSORA_ROTULO[i.status] === statusFiltro)
      ),
    [impressoras, statusFiltro, mostrarArquivadas]
  );
  const vencidas = impressoras.filter((i) => i.ativo && manutencaoVencida(i));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Impressoras</h1>
          <p className="text-sm text-zinc-500">{filtradas.length} impressora(s)</p>
        </div>
        {podeEditar && <NovaImpressora tarifaKwh={tarifaKwh} />}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}

      {vencidas.length > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            <span className="flex items-center gap-1.5 font-medium">
              <Wrench className="h-3.5 w-3.5" /> Manutenção vencida em {vencidas.length} impressora(s):
            </span>{" "}
            {vencidas.map((i) => i.nome).join(", ")}.
          </Aviso>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={statusFiltro}
          options={Object.values(STATUS_IMPRESSORA_ROTULO)}
          allLabel="Todos os status"
          onChange={setStatusFiltro}
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={mostrarArquivadas} onChange={(e) => setMostrarArquivadas(e.target.checked)} />
          Mostrar arquivadas
        </label>
      </div>

      <Cartao titulo="Parque de impressoras" icone={<Printer className="h-4 w-4" />}>
        {filtradas.length === 0 ? (
          <Vazio>
            {impressoras.length === 0
              ? "Nenhuma impressora cadastrada. Cadastre a primeira para calcular depreciação e energia nos orçamentos."
              : "Nenhuma impressora com esse filtro."}
          </Vazio>
        ) : (
          <div className="space-y-2">
            {filtradas.map((i) => (
              <Linha
                key={i.id}
                item={i}
                pecas={pecas.filter((p) => p.impressora_id === i.id)}
                manutencoes={manutencoes.filter((m) => m.impressora_id === i.id)}
                podeEditar={podeEditar}
                abas={abas}
                trabalhoAtual={trabalhosAtuais[i.id] ?? null}
                tarifaKwh={tarifaKwh}
              />
            ))}
          </div>
        )}
      </Cartao>
      <p className="mt-3 text-[11px] text-zinc-600">
        As horas de uso crescem quando um trabalho é concluído em Produção (e também podem ser informadas à mão).
        A produtividade medida por impressora fica na aba Produtividade da Produção.
      </p>
    </div>
  );
}
