"use client";

import { useActionState, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Campo, CLASSE_CAMPO, Entrada,
  ErroForm, Numero, Seletor, SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  alternarMaterialAtivo, atualizarMaterial, criarMaterial, excluirMaterial, movimentarEstoque,
} from "@/app/(dashboard)/impressao-3d/estoque/actions";
import {
  TIPO_MATERIAL_ROTULO, TIPO_MOVIMENTO_ROTULO, UNIDADE_ROTULO,
  type Material, type MovimentoEstoque, type TipoMaterial, type TipoMovimento,
} from "@/lib/impressao-3d/tipos";
import { abaixoDoMinimo, custoPorGrama, gramasDeRolos } from "@/lib/impressao-3d/regras";
import {
  formatDataHora, formatMoeda, formatNumero,
} from "@/lib/impressao-3d/numeros";

function CamposMaterial({ item, verCustos }: { item?: Material; verCustos: boolean }) {
  const [unidade, setUnidade] = useState(item?.unidade ?? "g");
  const [preco, setPreco] = useState(item?.preco_compra ?? 0);
  const [peso, setPeso] = useState(item?.peso_liquido_rolo_g ?? 0);
  const [corHex, setCorHex] = useState(item?.cor_hex ?? "");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Seletor rotulo="Tipo" name="tipo" defaultValue={item?.tipo ?? "filamento"}>
        {Object.entries(TIPO_MATERIAL_ROTULO).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Seletor>
      <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2" />
      <Seletor
        rotulo="Unidade do estoque"
        name="unidade"
        value={unidade}
        onChange={(e) => setUnidade(e.target.value as Material["unidade"])}
      >
        {Object.entries(UNIDADE_ROTULO).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </Seletor>
      <Entrada rotulo="Marca" name="marca" defaultValue={item?.marca ?? ""} />
      <Entrada rotulo="Material (PLA, PETG...)" name="material" defaultValue={item?.material ?? ""} />
      <Entrada rotulo="Cor" name="cor" defaultValue={item?.cor ?? ""} />
      <Campo rotulo="Cor (amostra)" ajuda="Formato #RRGGBB. Vazio = sem cor.">
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
      <Numero rotulo="Diâmetro (mm)" name="diametro_mm" defaultValue={item?.diametro_mm ?? ""} />
      <Numero
        rotulo="Peso líquido do rolo (g)"
        name="peso_liquido_rolo_g"
        defaultValue={item?.peso_liquido_rolo_g ?? ""}
        onChange={(e) => setPeso(Number(e.target.value) || 0)}
        ajuda="Sem o carretel. Base da entrada por rolos e do custo por grama."
      />
      {verCustos && (
        <Numero
          rotulo="Preço de compra (R$)"
          name="preco_compra"
          defaultValue={item?.preco_compra ?? ""}
          onChange={(e) => setPreco(Number(e.target.value) || 0)}
          ajuda="Preço de um rolo (ou de uma unidade de compra)."
        />
      )}
      {verCustos && (
        <div className="flex flex-col justify-end">
          <p className="text-xs font-medium text-zinc-400">Custo de cadastro</p>
          <p className="text-sm text-zinc-200">
            {formatMoeda(custoPorGrama(preco, peso), 4)}/{unidade}
          </p>
          <p className="text-[11px] text-zinc-600">preço ÷ peso líquido</p>
        </div>
      )}
      <Numero
        rotulo={`Estoque mínimo (${unidade})`}
        name="estoque_minimo"
        defaultValue={item?.estoque_minimo ?? ""}
        ajuda="0 = sem alerta."
      />
      <Entrada rotulo="Localização" name="localizacao" defaultValue={item?.localizacao ?? ""} />
      {item && (
        <p className="col-span-2 self-end text-[11px] text-zinc-600 sm:col-span-4">
          O saldo e o custo médio não são editados aqui: use Entrada, Ajuste ou Perda.
        </p>
      )}
    </div>
  );
}

function FormMaterial({ item, verCustos, aoFechar }: { item?: Material; verCustos: boolean; aoFechar: () => void }) {
  const acao = item ? atualizarMaterial.bind(null, item.id) : criarMaterial;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposMaterial item={item} verCustos={verCustos} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

type TipoAcao = "entrada" | "ajuste" | "perda";
const TITULO_ACAO: Record<TipoAcao, string> = {
  entrada: "Entrada de estoque",
  ajuste: "Ajuste de estoque",
  perda: "Registrar perda",
};

function FormMovimento({
  material,
  tipo,
  verCustos,
  aoFechar,
}: {
  material: Material;
  tipo: TipoAcao;
  verCustos: boolean;
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
            rotulo={tipo === "ajuste" ? `Quantidade com sinal (${un}) *` : `Quantidade (${un}) *`}
            name="quantidade"
            required
            min={tipo === "ajuste" ? undefined : "0.01"}
            onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
            ajuda={tipo === "ajuste" ? "Positivo soma, negativo subtrai. Ex.: -120 retira 120." : undefined}
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
          rotulo={tipo === "ajuste" ? "Motivo do ajuste *" : "Observação"}
          name="observacao"
          required={tipo === "ajuste"}
          className="col-span-2"
        />
      </div>
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
}: {
  item: Material;
  podeEditar: boolean;
  verCustos: boolean;
}) {
  const [modo, setModo] = useState<"nenhum" | "editar" | TipoAcao>("nenhum");
  const { executar, pendente } = useAcao();
  const baixo = abaixoDoMinimo(item);
  const fechar = () => setModo("nenhum");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-zinc-700"
            style={item.cor_hex ? { backgroundColor: item.cor_hex } : undefined}
            title={item.cor ?? "Sem cor"}
          />
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
              {item.nome}
              {baixo && <StatusChip tone="rose">Abaixo do mínimo</StatusChip>}
              {!item.ativo && <StatusChip tone="zinc">Arquivado</StatusChip>}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {[item.marca, item.material, item.cor].filter(Boolean).join(" · ") || "Sem detalhes"}
              {item.localizacao && ` · ${item.localizacao}`}
            </p>
            {verCustos && (
              <p className="truncate text-xs text-zinc-500">
                Custo/{item.unidade}: cadastro {formatMoeda(item.custo_cadastro ?? 0, 4)} · médio{" "}
                {item.custo_medio > 0 ? formatMoeda(item.custo_medio, 4) : "— (sem entradas)"}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <p className={`text-sm font-semibold ${baixo ? "text-rose-400" : "text-zinc-100"}`}>
              {formatNumero(item.estoque_atual, 1)} {item.unidade}
            </p>
            <p className="text-[11px] text-zinc-500">
              mín. {item.estoque_minimo > 0 ? `${formatNumero(item.estoque_minimo, 1)} ${item.unidade}` : "—"}
            </p>
          </div>
          {podeEditar && (
            <div className="flex items-center gap-0.5">
              <BotaoTexto onClick={() => setModo("entrada")}>Entrada</BotaoTexto>
              <BotaoTexto onClick={() => setModo("ajuste")}>Ajuste</BotaoTexto>
              <BotaoTexto onClick={() => setModo("perda")}>Perda</BotaoTexto>
              <button type="button" aria-label="Editar material" onClick={() => setModo("editar")} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                <Pencil className="h-3.5 w-3.5" />
              </button>
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
      </div>
      {modo === "editar" && <FormMaterial item={item} verCustos={verCustos} aoFechar={fechar} />}
      {(modo === "entrada" || modo === "ajuste" || modo === "perda") && (
        <FormMovimento material={item} tipo={modo} verCustos={verCustos} aoFechar={fechar} />
      )}
    </div>
  );
}

function Historico({
  materiais,
  movimentos,
  verCustos,
  limite,
}: {
  materiais: Material[];
  movimentos: MovimentoEstoque[];
  verCustos: boolean;
  limite: number;
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
}: {
  materiais: Material[];
  movimentos: MovimentoEstoque[];
  podeEditar: boolean;
  verCustos: boolean;
  limiteMovimentos: number;
}) {
  const [aba, setAba] = useState<"materiais" | "historico">("materiais");
  const [novo, setNovo] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);

  const visiveis = materiais.filter(
    (m) => (mostrarArquivados || m.ativo) && (!tipoFiltro || TIPO_MATERIAL_ROTULO[m.tipo] === tipoFiltro)
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
        {podeEditar && aba === "materiais" && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo material
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {baixos.length > 0 && (
        <div className="mb-4">
          <Aviso tom="alerta">
            Abaixo do mínimo: {baixos.map((m) => `${m.nome} (${formatNumero(m.estoque_atual, 1)} ${m.unidade})`).join(", ")}.
          </Aviso>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
          {([["materiais", "Materiais"], ["historico", "Histórico de movimentos"]] as const).map(([k, l]) => (
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
          </>
        )}
      </div>

      {aba === "historico" ? (
        <Cartao titulo="Histórico de movimentos" icone={<Boxes className="h-4 w-4" />}>
          <Historico materiais={materiais} movimentos={movimentos} verCustos={verCustos} limite={limiteMovimentos} />
        </Cartao>
      ) : (
        <div className="space-y-5">
          {novo && <FormMaterial verCustos={verCustos} aoFechar={() => setNovo(false)} />}
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
                      <LinhaMaterial key={m.id} item={m} podeEditar={podeEditar} verCustos={verCustos} />
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
