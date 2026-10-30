"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Boxes, ClipboardCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Campo, CLASSE_CAMPO, Entrada,
  ErroForm, Numero, Seletor, SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  alternarMaterialAtivo, atualizarMaterial, criarMaterial, excluirMaterial, movimentarEstoque, registrarCompraMaterial,
} from "@/app/(dashboard)/impressao-3d/estoque/actions";
import {
  TIPO_MATERIAL_ROTULO, TIPO_MOVIMENTO_ROTULO, UNIDADE_ROTULO,
  type Material, type MaterialParte, type MovimentoEstoque, type TipoMaterial, type TipoMovimento,
} from "@/lib/impressao-3d/tipos";
import { abaixoDoMinimo, gramasDeRolos } from "@/lib/impressao-3d/regras";
import {
  custoPorKgDeG, entradaDeCompraKg, entradaDeCompraUnidade, formatarSaldoPeso, precoPorGDeValorKg,
} from "@/lib/impressao-3d/filamentos";
import type { OpcaoFornecedor, Opcoes } from "@/lib/impressao-3d/opcoes";
import {
  formatDataHora, formatMoeda, formatNumero,
} from "@/lib/impressao-3d/numeros";
import { abaInicial } from "@/lib/modulos/preferencias";
import { FormAtualizarQuantidade, ConferirEstoque } from "@/components/impressao-3d/atualizar-quantidade";
import { PartesDoKit } from "@/components/impressao-3d/partes-kit";
import { ResumoInvestimentoCards } from "@/components/impressao-3d/investimento-estoque";
import {
  criterioOrdemValido, ordenarMateriais, saldoCurto, saldoCurtoKit, textoDisponiveis, textoPago, textoPrecoKg,
  type CriterioOrdem, type ResumoInvestimento,
} from "@/lib/impressao-3d/estoque-uso";
import { PecasEstoque, type DadosPecas } from "@/components/impressao-3d/pecas-estoque";
import { CamposComprador } from "@/components/impressao-3d/campos-comprador";
import { CorrigirComprador } from "@/components/impressao-3d/corrigir-comprador";
import { corrigirCompradorMovimento } from "@/app/(dashboard)/impressao-3d/estoque/actions";
import { rotuloComprador, type PessoaComprador } from "@/lib/impressao-3d/comprador";
import { formatDataIso } from "@/lib/impressao-3d/datas";

/** Quem pode ser escolhido em "Quem comprou" e quem está logado (padrão do seletor). */
export interface DadosCompradores {
  pessoas: PessoaComprador[];
  usuarioId: string | null;
}

function CamposMaterial({
  item,
  verCustos,
  fornecedores,
  compradores,
}: {
  item?: Material;
  verCustos: boolean;
  fornecedores: Opcoes<OpcaoFornecedor>;
  compradores: DadosCompradores;
}) {
  const [unidade, setUnidade] = useState(item?.unidade ?? "g");
  // Kit/conjunto: unidade 'un' (o servidor força), preço pago = valor do kit.
  const [kit, setKit] = useState(item?.kit ?? false);
  const [kitItens, setKitItens] = useState(String(item?.kit_itens ?? ""));
  const porPeso = !kit && unidade === "g";
  // Valor do kg: no filamento o custo_cadastro já é por g (valor do kg ÷ 1000), mesmo em cadastros antigos por rolo.
  const valorInicial =
    item == null
      ? ""
      : porPeso && item.custo_cadastro != null
        ? custoPorKgDeG(item.custo_cadastro)
        : (item.preco_compra ?? "");
  const [valor, setValor] = useState<string>(String(valorInicial));
  const [comprei, setComprei] = useState("");
  const [unidadeCompra, setUnidadeCompra] = useState<"kg" | "g">("kg");
  const [corHex, setCorHex] = useState(item?.cor_hex ?? "");
  const valorNum = Number(valor.replace(",", ".")) || 0;
  const compreiNum = Number(comprei.replace(",", ".")) || 0;
  const entrada = porPeso
    ? entradaDeCompraKg({ quantidade: compreiNum, unidade: unidadeCompra, valorKg: verCustos ? valorNum : null })
    : entradaDeCompraUnidade({ quantidade: compreiNum, precoUnitario: verCustos ? valorNum : null });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Entrada
          rotulo="Nome / descrição *"
          name="nome"
          required
          defaultValue={item?.nome}
          className="col-span-2"
          placeholder="Ex.: PLA preto Voolt"
        />
        <Seletor rotulo="Tipo" name="tipo" defaultValue={item?.tipo ?? "filamento"}>
          {Object.entries(TIPO_MATERIAL_ROTULO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Seletor>
        <div className="col-span-2 space-y-2 rounded-lg border border-zinc-800 p-3 sm:col-span-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="kit"
              checked={kit}
              onChange={(e) => setKit(e.target.checked)}
              className="h-5 w-5 shrink-0"
            />
            <span>É um kit/conjunto <span className="text-xs text-zinc-500">(várias cores ou peças vendidas juntas)</span></span>
          </label>
          {kit && (
            <Numero
              rotulo="Quantas peças/cores tem no kit *"
              name="kit_itens"
              required
              min="1"
              step="1"
              inputMode="numeric"
              value={kitItens}
              onChange={(e) => setKitItens(e.target.value)}
              ajuda="O saldo é o número de kits. O preço pago é o valor do kit. As cores ficam no detalhe do kit."
            />
          )}
        </div>
        <Entrada rotulo="Material" name="material" defaultValue={item?.material ?? ""} placeholder="PLA, PETG, ABS..." />
        <Entrada rotulo="Cor" name="cor" defaultValue={item?.cor ?? ""} placeholder="Preto" />
        <Campo rotulo="Seletor de cor" ajuda="Só para identificar na lista.">
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Escolher cor"
              value={/^#[0-9A-Fa-f]{6}$/.test(corHex) ? corHex : "#808080"}
              onChange={(e) => setCorHex(e.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
            />
            <input
              name="cor_hex"
              value={corHex}
              onChange={(e) => setCorHex(e.target.value)}
              placeholder="#RRGGBB"
              maxLength={7}
              className={CLASSE_CAMPO}
            />
          </div>
        </Campo>
        {verCustos && (
          <Numero
            rotulo={kit ? "Valor pago pelo kit (R$)" : porPeso ? "Valor pago por kg (R$)" : "Valor pago por unidade (R$)"}
            name="preco_compra"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            ajuda={kit ? "Quanto você pagou pelo kit inteiro." : porPeso ? "Quanto você paga em 1 kg do filamento (está na nota de compra)." : "Quanto você paga em uma unidade."}
          />
        )}
        {!item && (
          <>
            <Numero
              rotulo={kit ? "Quantos kits comprei" : "Quanto comprei"}
              name="quanto_comprei"
              value={comprei}
              onChange={(e) => setComprei(e.target.value)}
              ajuda={
                entrada
                  ? `Entrada de ${formatNumero(entrada.quantidade, 1)} ${porPeso ? "g" : unidade} no estoque${
                      entrada.custoTotal != null ? ` por ${formatMoeda(entrada.custoTotal)}` : ""
                    }.`
                  : "0 = só cadastra, sem dar entrada no estoque."
              }
            />
            {porPeso ? (
              <Seletor rotulo="Em" name="unidade_compra" value={unidadeCompra} onChange={(e) => setUnidadeCompra(e.target.value as "kg" | "g")}>
                <option value="kg">kg</option>
                <option value="g">g</option>
              </Seletor>
            ) : (
              <div className="flex flex-col justify-end text-xs text-zinc-500">{kit ? "em kits" : `na unidade do material (${unidade})`}</div>
            )}
          </>
        )}
        {!item && compreiNum > 0 && (
          <CamposComprador
            pessoas={compradores.pessoas}
            usuarioId={compradores.usuarioId}
            nomeData="data_compra"
            className="col-span-2 sm:col-span-4"
          />
        )}
        {verCustos && porPeso && valorNum > 0 && (
          <div className="flex flex-col justify-end">
            <p className="text-xs font-medium text-zinc-400">Custo por g</p>
            <p className="text-sm text-zinc-200">{formatMoeda(precoPorGDeValorKg(valorNum), 4)}/g</p>
            <p className="text-[11px] text-zinc-600">valor do kg ÷ 1000</p>
          </div>
        )}
      </div>
      {!item && !verCustos && (
        <p className="text-[11px] text-zinc-500">Sem a permissão de custos, a entrada é registrada sem valor.</p>
      )}

      <details open={!!item} className="rounded-lg border border-zinc-800">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200">
          Mais opções (unidade, marca, diâmetro, estoque mínimo, fornecedor, localização)
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t border-zinc-800 p-3 sm:grid-cols-4">
          {kit && <input type="hidden" name="unidade" value="un" />}
          <Seletor
            rotulo="Unidade do estoque"
            name={kit ? undefined : "unidade"}
            value={kit ? "un" : unidade}
            disabled={kit}
            onChange={(e) => setUnidade(e.target.value as Material["unidade"])}
            ajuda={kit ? "Kit sempre em unidades." : undefined}
          >
            {Object.entries(UNIDADE_ROTULO).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Seletor>
          <Entrada rotulo="Marca" name="marca" defaultValue={item?.marca ?? ""} />
          <Numero rotulo="Diâmetro (mm)" name="diametro_mm" defaultValue={item?.diametro_mm ?? ""} />
          <Numero
            rotulo={`Estoque mínimo (${unidade})`}
            name="estoque_minimo"
            defaultValue={item?.estoque_minimo ?? ""}
            ajuda="0 = sem alerta."
          />
          <Entrada rotulo="Localização" name="localizacao" defaultValue={item?.localizacao ?? ""} />
          {fornecedores.acessivel ? (
            <Seletor rotulo="Fornecedor" name="fornecedor_id" defaultValue={item?.fornecedor_id ?? ""}>
              <option value="">Sem fornecedor</option>
              {fornecedores.itens
                .filter((f) => f.ativo || f.id === item?.fornecedor_id)
                .map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}{f.ativo ? "" : " (inativo)"}</option>
                ))}
            </Seletor>
          ) : (
            // Sem acesso a Fornecedores: o vínculo atual é mantido ao salvar.
            <input type="hidden" name="fornecedor_id" value={item?.fornecedor_id ?? ""} />
          )}
        </div>
      </details>
      {item && (
        <p className="text-[11px] text-zinc-600">
          O saldo e o custo médio não são editados aqui: use Atualizar quantidade, Nova compra, Entrada ou Perda.
        </p>
      )}
    </div>
  );
}

/** Nova compra de um filamento já cadastrado: nova entrada com o valor pago (atualiza o custo médio). */
function FormCompra({
  material, verCustos, compradores, aoFechar,
}: { material: Material; verCustos: boolean; compradores: DadosCompradores; aoFechar: () => void }) {
  const [state, formAction, pendente] = useActionState(registrarCompraMaterial.bind(null, material.id), undefined);
  useActionSuccess(state, aoFechar);
  const porPeso = material.unidade === "g";
  const [quantidade, setQuantidade] = useState("");
  const [unidadeCompra, setUnidadeCompra] = useState<"kg" | "g">("kg");
  const [valorKg, setValorKg] = useState(
    material.custo_cadastro != null && porPeso ? String(custoPorKgDeG(material.custo_cadastro)) : String(material.preco_compra ?? "")
  );
  const q = Number(quantidade.replace(",", ".")) || 0;
  const v = Number(valorKg.replace(",", ".")) || 0;
  const previa = porPeso
    ? entradaDeCompraKg({ quantidade: q, unidade: unidadeCompra, valorKg: verCustos ? v : null })
    : entradaDeCompraUnidade({ quantidade: q, precoUnitario: verCustos ? v : null });

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <input type="hidden" name="unidade_compra" value={unidadeCompra} />
      <p className="text-sm font-medium text-zinc-100">
        Nova compra · {material.nome}{" "}
        <span className="text-xs font-normal text-zinc-500">
          (saldo atual {descreverSaldo(material.estoque_atual, material.unidade)})
        </span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero
          rotulo="Quanto comprei *"
          name="quantidade"
          required
          min="0.001"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
        {porPeso && (
          <Seletor rotulo="Em" value={unidadeCompra} onChange={(e) => setUnidadeCompra(e.target.value as "kg" | "g")}>
            <option value="kg">kg</option>
            <option value="g">g</option>
          </Seletor>
        )}
        {verCustos && (
          <Numero
            rotulo={porPeso ? "Valor pago por kg (R$)" : "Valor pago por unidade (R$)"}
            name="valor_pago"
            value={valorKg}
            onChange={(e) => setValorKg(e.target.value)}
            ajuda={
              previa?.custoTotal != null
                ? `Total desta compra: ${formatMoeda(previa.custoTotal)}. Atualiza o custo médio.`
                : "Vazio = entrada sem custo informado."
            }
          />
        )}
      </div>
      <CamposComprador pessoas={compradores.pessoas} usuarioId={compradores.usuarioId} nomeData="data_compra" />
      {!verCustos && <p className="text-[11px] text-zinc-500">Sem a permissão de custos, a entrada é registrada sem valor.</p>}
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Registrar compra"}</BotaoPrimario>
      </div>
    </form>
  );
}

/** "2,5 kg" para filamento em gramas; as demais unidades ficam como estão. */
function descreverSaldo(saldo: number, unidade: string): string {
  if (unidade !== "g") return `${formatNumero(saldo, 1)} ${unidade}`;
  const s = formatarSaldoPeso(saldo);
  return `${formatNumero(s.valor, 2)} ${s.unidade}`;
}

function FormMaterial({
  item,
  verCustos,
  fornecedores,
  compradores,
  aoFechar,
}: {
  item?: Material;
  verCustos: boolean;
  fornecedores: Opcoes<OpcaoFornecedor>;
  compradores: DadosCompradores;
  aoFechar: () => void;
}) {
  const acao = item ? atualizarMaterial.bind(null, item.id) : criarMaterial;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposMaterial item={item} verCustos={verCustos} fornecedores={fornecedores} compradores={compradores} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

type TipoAcao = "entrada" | "perda";
const TITULO_ACAO: Record<TipoAcao, string> = {
  entrada: "Entrada de estoque",
  perda: "Registrar perda",
};

function FormMovimento({
  material,
  tipo,
  verCustos,
  compradores,
  aoFechar,
}: {
  material: Material;
  tipo: TipoAcao;
  verCustos: boolean;
  compradores: DadosCompradores;
  aoFechar: () => void;
}) {
  const [state, formAction, pendente] = useActionState(movimentarEstoque.bind(null, material.id), undefined);
  useActionSuccess(state, aoFechar);
  const porRolos = tipo === "entrada" && material.unidade === "g" && (material.peso_liquido_rolo_g ?? 0) > 0;
  const [modo, setModo] = useState<"rolos" | "direto">(porRolos ? "rolos" : "direto");
  const [rolos, setRolos] = useState(1);
  const [quantidade, setQuantidade] = useState(0);
  const [custo, setCusto] = useState<string>("");
  const peso = material.peso_liquido_rolo_g ?? 0;
  const gramas = modo === "rolos" ? gramasDeRolos(rolos, peso) : quantidade;
  const custoNum = Number(String(custo).replace(",", ".")) || 0;
  const un = material.unidade;

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-copper-500/30 bg-zinc-950/60 p-3">
      <input type="hidden" name="tipo" value={tipo} />
      <p className="text-sm font-medium text-zinc-100">
        {TITULO_ACAO[tipo]} · {material.nome}{" "}
        <span className="text-xs font-normal text-zinc-500">
          (saldo atual {formatNumero(material.estoque_atual, 1)} {un})
        </span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tipo === "entrada" && porRolos && (
          <Seletor rotulo="Entrada por" value={modo} onChange={(e) => setModo(e.target.value as "rolos" | "direto")}>
            <option value="rolos">Rolos</option>
            <option value="direto">Quantidade em gramas</option>
          </Seletor>
        )}
        {modo === "rolos" && tipo === "entrada" ? (
          <Numero
            rotulo="Rolos *"
            name="rolos"
            required
            min="0.01"
            value={rolos || ""}
            onChange={(e) => setRolos(Number(e.target.value) || 0)}
            ajuda={`${formatNumero(rolos || 0, 2)} × ${formatNumero(peso, 1)} g = ${formatNumero(gramas, 1)} g`}
          />
        ) : (
          <Numero
            rotulo={`Quantidade (${un}) *`}
            name="quantidade"
            required
            min="0.01"
            onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
          />
        )}
        {tipo === "entrada" && verCustos && (
          <Numero
            rotulo="Custo total (R$)"
            name="custo_total"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
            ajuda={
              gramas > 0 && custoNum > 0
                ? `Custo desta entrada: ${formatMoeda(custoNum / gramas, 4)}/${un}. Atualiza o custo médio.`
                : "Ex.: 3 rolos × preço do rolo. Vazio = entrada sem custo informado."
            }
          />
        )}
        {tipo === "entrada" && verCustos && modo === "rolos" && (material.preco_compra ?? 0) > 0 && rolos > 0 && (
          <div className="flex items-end pb-1">
            <BotaoTexto onClick={() => setCusto(String(Math.round(rolos * (material.preco_compra ?? 0) * 100) / 100))}>
              Usar {formatNumero(rolos, 2)} × {formatMoeda(material.preco_compra ?? 0)} do cadastro
            </BotaoTexto>
          </div>
        )}
        <Entrada
          rotulo="Observação"
          name="observacao"
          className="col-span-2"
        />
      </div>
      {tipo === "entrada" && (
        <CamposComprador pessoas={compradores.pessoas} usuarioId={compradores.usuarioId} nomeData="data_compra" />
      )}
      {tipo === "entrada" && !verCustos && (
        <p className="text-[11px] text-zinc-500">Sem a permissão de custos, a entrada é registrada sem valor.</p>
      )}
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Registrar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function LinhaMaterial({
  item,
  podeEditar,
  verCustos,
  fornecedores,
  compradores,
  partes,
  pago,
}: {
  item: Material;
  podeEditar: boolean;
  verCustos: boolean;
  fornecedores: Opcoes<OpcaoFornecedor>;
  compradores: DadosCompradores;
  /** Cores/peças do kit (vazio se não é kit). */
  partes: MaterialParte[];
  /** Total pago em todas as entradas do item (view p3d_materiais_resumo); só quem vê custos. */
  pago: { total: number; compras: number } | undefined;
}) {
  const [modo, setModo] = useState<"nenhum" | "editar" | "compra" | "quantidade" | "partes" | TipoAcao>("nenhum");
  const { executar, pendente } = useAcao();
  const baixo = abaixoDoMinimo(item);
  const fechar = () => setModo("nenhum");

  // O destaque é o PREÇO PAGO; o saldo (g, kg, un, "9 de 12") é informação secundária.
  const precoKg = item.unidade === "g" && !item.kit ? textoPrecoKg(item.custo_medio, item.custo_cadastro) : null;
  const saldoTexto = item.kit ? saldoCurtoKit(item.estoque_atual) : saldoCurto(item.estoque_atual, item.unidade);
  const disponiveisTexto = item.kit ? textoDisponiveis(partes, item.kit_itens) : null;

  return (
    <div className="space-y-2">
      <div className="space-y-3 rounded-lg border border-zinc-800/80 px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-zinc-700"
              style={item.cor_hex ? { backgroundColor: item.cor_hex } : undefined}
              title={item.cor ?? "Sem cor"}
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                {item.nome}
                {baixo && <StatusChip tone="rose">Abaixo do mínimo</StatusChip>}
                {!item.ativo && <StatusChip tone="zinc">Arquivado</StatusChip>}
              </p>
              <p className="text-xs text-zinc-500">
                {[item.material, item.cor, item.marca].filter(Boolean).join(" · ") || "Sem detalhes"}
                {item.localizacao && ` · ${item.localizacao}`}
                {item.fornecedor_id && fornecedores.acessivel && ` · ${fornecedores.itens.find((f) => f.id === item.fornecedor_id)?.nome ?? "fornecedor"}`}
              </p>
              {/* Custo por unidade só em itens avulsos: kit e conjunto não mostram "custo por unidade". */}
              {verCustos && item.unidade !== "g" && !item.kit && (
                <p className="text-xs text-zinc-500">
                  Custo por {item.unidade}: cadastro {formatMoeda(item.custo_cadastro ?? 0, 4)} · médio{" "}
                  {item.custo_medio > 0 ? formatMoeda(item.custo_medio, 4) : "— (sem entradas)"}
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 sm:text-right" aria-label={`Valor e saldo de ${item.nome}`}>
            {verCustos ? (
              <>
                <p className="text-xl font-bold leading-tight text-zinc-50">{textoPago(pago?.total)}</p>
                {precoKg && <p className="text-base font-bold text-copper-300">{precoKg}</p>}
              </>
            ) : (
              <p className={`text-base font-semibold ${baixo ? "text-rose-400" : "text-zinc-100"}`}>{saldoTexto}</p>
            )}
            <p className={`text-xs ${baixo ? "text-rose-400" : "text-zinc-500"}`}>
              {[verCustos ? saldoTexto : null, disponiveisTexto].filter(Boolean).join(" · ")}
            </p>
            <p className="text-[11px] text-zinc-600">
              mín. {item.estoque_minimo > 0 ? descreverSaldo(item.estoque_minimo, item.unidade) : "—"}
            </p>
          </div>
        </div>
        {item.kit && !podeEditar && (
          <div className="flex flex-wrap items-center gap-1.5">
            <BotaoTexto onClick={() => setModo(modo === "partes" ? "nenhum" : "partes")}>Ver cores do kit</BotaoTexto>
          </div>
        )}
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModo(modo === "quantidade" ? "nenhum" : "quantidade")}
              className="rounded-md bg-copper-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-copper-500"
            >
              Atualizar quantidade
            </button>
            <BotaoTexto onClick={() => setModo(modo === "editar" ? "nenhum" : "editar")}>
              <span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</span>
            </BotaoTexto>
            {item.kit && (
              <BotaoTexto onClick={() => setModo(modo === "partes" ? "nenhum" : "partes")}>Cores do kit</BotaoTexto>
            )}
            <BotaoTexto onClick={() => setModo("compra")}>Nova compra</BotaoTexto>
            <BotaoTexto onClick={() => setModo("entrada")}>Entrada</BotaoTexto>
            <BotaoTexto onClick={() => setModo("perda")}>Perda</BotaoTexto>
            <button
              type="button"
              disabled={pendente}
              aria-label={item.ativo ? "Arquivar material" : "Reativar material"}
              title={item.ativo ? "Arquivar" : "Reativar"}
              onClick={() => executar(() => alternarMaterialAtivo(item.id, !item.ativo), { sucesso: item.ativo ? "Material arquivado." : "Material reativado." })}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
            >
              {item.ativo ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              disabled={pendente}
              aria-label="Excluir material"
              onClick={() => executar(() => excluirMaterial(item.id), { confirmar: `Excluir "${item.nome}"? Materiais com histórico não podem ser excluídos: arquive.`, sucesso: "Material excluído." })}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      {modo === "partes" && item.kit && <PartesDoKit material={item} partes={partes} podeEditar={podeEditar} />}
      {modo === "quantidade" && <FormAtualizarQuantidade material={item} aoFechar={fechar} />}
      {modo === "editar" && <FormMaterial item={item} verCustos={verCustos} fornecedores={fornecedores} compradores={compradores} aoFechar={fechar} />}
      {modo === "compra" && <FormCompra material={item} verCustos={verCustos} compradores={compradores} aoFechar={fechar} />}
      {(modo === "entrada" || modo === "perda") && (
        <FormMovimento material={item} tipo={modo} verCustos={verCustos} compradores={compradores} aoFechar={fechar} />
      )}
    </div>
  );
}

function Historico({
  materiais,
  movimentos,
  verCustos,
  limite,
  podeEditar,
  compradores,
}: {
  materiais: Material[];
  movimentos: MovimentoEstoque[];
  verCustos: boolean;
  limite: number;
  podeEditar: boolean;
  compradores: DadosCompradores;
}) {
  const [materialFiltro, setMaterialFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const porId = useMemo(() => new Map(materiais.map((m) => [m.id, m])), [materiais]);
  const filtrados = movimentos.filter(
    (m) =>
      (!materialFiltro || porId.get(m.material_id)?.nome === materialFiltro) &&
      (!tipoFiltro || TIPO_MOVIMENTO_ROTULO[m.tipo] === tipoFiltro)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={materialFiltro}
          options={[...new Set(materiais.map((m) => m.nome))].sort()}
          allLabel="Todos os materiais"
          onChange={setMaterialFiltro}
        />
        <SegmentFilter
          value={tipoFiltro}
          options={Object.values(TIPO_MOVIMENTO_ROTULO)}
          allLabel="Todos os tipos"
          onChange={setTipoFiltro}
        />
      </div>
      {filtrados.length === 0 ? (
        <Vazio>{movimentos.length === 0 ? "Nenhum movimento registrado ainda." : "Nenhum movimento com esse filtro."}</Vazio>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Data</th>
                <th className="px-3 py-2 font-medium">Material</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 text-right font-medium">Variação</th>
                <th className="px-3 py-2 text-right font-medium">Saldo após</th>
                {verCustos && <th className="px-3 py-2 text-right font-medium">Custo unit.</th>}
                {verCustos && <th className="px-3 py-2 text-right font-medium">Custo total</th>}
                <th className="px-3 py-2 font-medium">Feito por</th>
                <th className="px-3 py-2 font-medium">Comprador</th>
                <th className="px-3 py-2 font-medium">Data da compra</th>
                <th className="px-3 py-2 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filtrados.map((m) => {
                const mat = porId.get(m.material_id);
                return (
                  <tr key={m.id} className="text-zinc-300">
                    <td className="whitespace-nowrap px-3 py-2">{formatDataHora(m.created_at)}</td>
                    <td className="px-3 py-2">{mat?.nome ?? "—"}</td>
                    <td className="px-3 py-2">{TIPO_MOVIMENTO_ROTULO[m.tipo as TipoMovimento] ?? m.tipo}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right ${m.delta < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {m.delta > 0 ? "+" : ""}
                      {formatNumero(m.delta, 2)} {mat?.unidade}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">{formatNumero(m.saldo_apos, 2)} {mat?.unidade}</td>
                    {verCustos && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">{m.custo_unitario != null ? formatMoeda(m.custo_unitario, 4) : "—"}</td>
                    )}
                    {verCustos && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">{m.custo_total != null ? formatMoeda(m.custo_total) : "—"}</td>
                    )}
                    <td className="whitespace-nowrap px-3 py-2">
                      {m.user_id ? (compradores.pessoas.find((p) => p.id === m.user_id)?.nome ?? "—") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {m.tipo === "entrada" ? (
                        <div className="flex flex-col items-start gap-1">
                          <span>{rotuloComprador(m, compradores.pessoas)}</span>
                          {podeEditar && (
                            <CorrigirComprador acao={corrigirCompradorMovimento.bind(null, m.id)} atual={m} pessoas={compradores.pessoas} />
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{m.tipo === "entrada" && m.data_compra ? formatDataIso(m.data_compra) : "—"}</td>
                    <td className="px-3 py-2 text-zinc-500">{m.observacao ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {movimentos.length >= limite && (
        <p className="text-[11px] text-zinc-600">Mostrando os {limite} movimentos mais recentes.</p>
      )}
    </div>
  );
}

export function EstoqueBoard({
  materiais,
  movimentos,
  podeEditar,
  verCustos,
  limiteMovimentos,
  fornecedores,
  pecas,
  abas,
  compradores,
  atalhoGastos,
  partes,
  pagoPorMaterial,
  resumo,
  erroResumo,
}: {
  compradores: DadosCompradores;
  /** Cores/peças dos kits. */
  partes: MaterialParte[];
  /** material_id → total pago (view p3d_materiais_resumo); vazio sem o extra "custos". */
  pagoPorMaterial: Record<string, { total: number; compras: number }>;
  /** Resumo do investimento (p3d_resumo_investimento); null sem o extra "custos". */
  resumo: ResumoInvestimento | null;
  erroResumo: string | null;
  /** Link para "Gastos por pessoa" (só quando a pessoa pode ver e o módulo Relatórios está desligado). */
  atalhoGastos?: string;
  pecas: DadosPecas;
  materiais: Material[];
  movimentos: MovimentoEstoque[];
  podeEditar: boolean;
  verCustos: boolean;
  limiteMovimentos: number;
  fornecedores: Opcoes<OpcaoFornecedor>;
  /** Abas visíveis pela preferência de navegação (nunca vazia; ordem do registro). */
  abas: string[];
}) {
  const [aba, setAba] = useState<"materiais" | "pecas" | "historico">(abaInicial(abas, "materiais"));
  const [novo, setNovo] = useState(false);
  const [conferindo, setConferindo] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [ordem, setOrdem] = useState<CriterioOrdem>("nome");
  const pagos = useMemo(() => new Map(Object.entries(pagoPorMaterial)), [pagoPorMaterial]);

  // Por nome (padrão) ou por valor pago (maior primeiro).
  const visiveis = ordenarMateriais(
    materiais.filter((m) => (mostrarArquivados || m.ativo) && (!tipoFiltro || TIPO_MATERIAL_ROTULO[m.tipo] === tipoFiltro)),
    ordem,
    pagos
  );
  const baixos = materiais.filter((m) => m.ativo && abaixoDoMinimo(m));
  const tipos = (Object.keys(TIPO_MATERIAL_ROTULO) as TipoMaterial[]).filter((t) =>
    visiveis.some((m) => m.tipo === t)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Estoque</h1>
          <p className="text-sm text-zinc-500">{visiveis.length} item(ns)</p>
        </div>
        {atalhoGastos && (
          <Link href={atalhoGastos} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-800">
            Gastos por pessoa
          </Link>
        )}
        {podeEditar && aba === "materiais" && !novo && (
          <div className="flex flex-wrap items-center gap-2">
            {!conferindo && visiveis.length > 0 && (
              <button
                type="button"
                onClick={() => setConferindo(true)}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
              >
                <ClipboardCheck className="h-4 w-4" /> Conferir estoque
              </button>
            )}
            <BotaoNovo onClick={() => setNovo(true)}>
              <Plus className="h-4 w-4" /> Novo material
            </BotaoNovo>
          </div>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {baixos.length > 0 && aba !== "pecas" && (
        <div className="mb-4">
          <Aviso tom="alerta">
            Abaixo do mínimo: {baixos.map((m) => `${m.nome} (${formatNumero(m.estoque_atual, 1)} ${m.unidade})`).join(", ")}.
          </Aviso>
        </div>
      )}

      {aba === "materiais" && <ResumoInvestimentoCards resumo={resumo} erro={erroResumo} />}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div data-faixa-abas className="inline-flex max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {([["materiais", "Material"], ["pecas", "Peças"], ["historico", "Histórico de material"]] as const).filter(([k]) => abas.includes(k)).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setAba(k)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${aba === k ? "bg-copper-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {aba === "materiais" && (
          <>
            <SegmentFilter
              value={tipoFiltro}
              options={Object.values(TIPO_MATERIAL_ROTULO)}
              allLabel="Todos os tipos"
              onChange={setTipoFiltro}
            />
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={mostrarArquivados} onChange={(e) => setMostrarArquivados(e.target.checked)} />
              Mostrar arquivados
            </label>
            {verCustos && (
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                Ordenar por
                <select
                  value={ordem}
                  onChange={(e) => setOrdem(criterioOrdemValido(e.target.value))}
                  aria-label="Ordenar por"
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm outline-none focus:border-copper-500"
                >
                  <option value="nome">Nome</option>
                  <option value="valor_pago">Valor pago</option>
                </select>
              </label>
            )}
          </>
        )}
      </div>

      {aba === "pecas" ? (
        <PecasEstoque dados={pecas} podeEditar={podeEditar} verCustos={verCustos} limiteMovimentos={limiteMovimentos} />
      ) : aba === "historico" ? (
        <Cartao titulo="Histórico de movimentos" icone={<Boxes className="h-4 w-4" />}>
          <Historico materiais={materiais} movimentos={movimentos} verCustos={verCustos} limite={limiteMovimentos} podeEditar={podeEditar} compradores={compradores} />
        </Cartao>
      ) : (
        <div className="space-y-5">
          {conferindo && <ConferirEstoque materiais={visiveis} partes={partes} aoFechar={() => setConferindo(false)} />}
          {novo && <FormMaterial verCustos={verCustos} fornecedores={fornecedores} compradores={compradores} aoFechar={() => setNovo(false)} />}
          {visiveis.length === 0 && !novo ? (
            <Cartao titulo="Materiais" icone={<Boxes className="h-4 w-4" />}>
              <Vazio>
                {materiais.length === 0
                  ? "Nenhum material cadastrado. Cadastre filamentos, resinas, embalagens e insumos para controlar o saldo."
                  : "Nenhum material com esse filtro."}
              </Vazio>
            </Cartao>
          ) : (
            tipos.map((t) => (
              <Cartao key={t} titulo={`${TIPO_MATERIAL_ROTULO[t]} (${visiveis.filter((m) => m.tipo === t).length})`} icone={<Boxes className="h-4 w-4" />}>
                <div className="space-y-2">
                  {visiveis
                    .filter((m) => m.tipo === t)
                    .map((m) => (
                      <LinhaMaterial key={m.id} item={m} podeEditar={podeEditar} verCustos={verCustos} fornecedores={fornecedores} compradores={compradores} partes={partes.filter((p) => p.material_id === m.id)} pago={pagos.get(m.id)} />
                    ))}
                </div>
              </Cartao>
            ))
          )}
        </div>
      )}
    </div>
  );
}
