"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Package, Plus, Trash2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  AreaTexto, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import {
  alternarProdutoAtivo, atualizarProduto, criarProduto, excluirProduto,
} from "@/app/(dashboard)/impressao-3d/produtos/actions";
import type { Produto } from "@/lib/impressao-3d/tipos";
import type { OpcaoImpressora, OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import { formatMoeda } from "@/lib/impressao-3d/numeros";

export function CamposProduto({
  item,
  impressoras,
  materiais,
}: {
  item?: Produto;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2" />
      <Entrada rotulo="Categoria" name="categoria" defaultValue={item?.categoria ?? ""} />
      <Entrada rotulo="SKU" name="sku" defaultValue={item?.sku ?? ""} ajuda="Único por empresa." />
      {impressoras.acessivel ? (
        <Seletor rotulo="Impressora padrão" name="impressora_id" defaultValue={item?.impressora_id ?? ""}>
          <option value="">Nenhuma</option>
          {impressoras.itens.map((i) => (
            <option key={i.id} value={i.id}>{i.nome}</option>
          ))}
        </Seletor>
      ) : (
        <input type="hidden" name="impressora_id" value={item?.impressora_id ?? ""} />
      )}
      {materiais.acessivel ? (
        <Seletor rotulo="Material padrão" name="material_id" defaultValue={item?.material_id ?? ""}>
          <option value="">Nenhum</option>
          {materiais.itens.map((m) => (
            <option key={m.id} value={m.id}>{m.nome}</option>
          ))}
        </Seletor>
      ) : (
        <input type="hidden" name="material_id" value={item?.material_id ?? ""} />
      )}
      <Numero rotulo="Peso estimado (g)" name="peso_estimado_g" defaultValue={item?.peso_estimado_g ?? ""} />
      <Numero rotulo="Horas estimadas" name="horas_estimadas" defaultValue={item?.horas_estimadas ?? ""} />
      <Numero rotulo="Preço de venda (R$)" name="preco_venda" defaultValue={item?.preco_venda ?? ""} />
      <label className="flex items-end gap-2 pb-2 text-xs text-zinc-400">
        <input type="checkbox" name="publicado_loja" defaultChecked={item?.publicado_loja ?? false} />
        <span>
          Marcar para a loja
          <span className="block text-[11px] text-zinc-600">Só uma marcação; a loja virá em outra etapa.</span>
        </span>
      </label>
      <AreaTexto rotulo="Descrição" name="descricao" defaultValue={item?.descricao ?? ""} className="col-span-2 sm:col-span-4" />
      {(!impressoras.acessivel || !materiais.acessivel) && (
        <p className="col-span-2 text-[11px] text-zinc-600 sm:col-span-4">
          Sem acesso a {[!impressoras.acessivel && "Impressoras", !materiais.acessivel && "Estoque"].filter(Boolean).join(" e ")}:
          a escolha atual é mantida.
        </p>
      )}
    </div>
  );
}

export function FormProduto({
  item,
  impressoras,
  materiais,
  aoFechar,
}: {
  item?: Produto;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  aoFechar: () => void;
}) {
  const acao = item ? atualizarProduto.bind(null, item.id) : criarProduto;
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <CamposProduto item={item} impressoras={impressoras} materiais={materiais} />
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

export function ProdutosBoard({
  produtos,
  variacoesPorProduto,
  impressoras,
  materiais,
  podeEditar,
}: {
  produtos: Produto[];
  variacoesPorProduto: Record<string, number>;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  podeEditar: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const { executar, pendente } = useAcao();

  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter((c): c is string => !!c))].sort(),
    [produtos]
  );
  const visiveis = produtos.filter(
    (p) => (mostrarArquivados || p.ativo) && (!categoria || p.categoria === categoria)
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Produtos e catálogo</h1>
          <p className="text-sm text-zinc-500">{visiveis.length} produto(s)</p>
        </div>
        {podeEditar && !novo && (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Novo produto
          </BotaoNovo>
        )}
      </div>
      {!podeEditar && (
        <div className="mb-4">
          <SomenteLeitura />
        </div>
      )}
      {novo && (
        <div className="mb-5">
          <FormProduto impressoras={impressoras} materiais={materiais} aoFechar={() => setNovo(false)} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {categorias.length > 0 && (
          <SegmentFilter value={categoria} options={categorias} allLabel="Todas as categorias" onChange={setCategoria} />
        )}
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={mostrarArquivados} onChange={(e) => setMostrarArquivados(e.target.checked)} />
          Mostrar arquivados
        </label>
      </div>

      <Cartao titulo="Catálogo" icone={<Package className="h-4 w-4" />}>
        {visiveis.length === 0 ? (
          <Vazio>
            {produtos.length === 0
              ? "Nenhum produto cadastrado. Cadastre o primeiro e anexe os arquivos STL, 3MF, GCODE e fotos."
              : "Nenhum produto com esse filtro."}
          </Vazio>
        ) : (
          <div className="space-y-2">
            {visiveis.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <Link href={`/impressao-3d/produtos/${p.id}`} className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {p.nome}
                    {p.categoria && <StatusChip tone="copper">{p.categoria}</StatusChip>}
                    {p.publicado_loja && <StatusChip tone="sky">Marcado para a loja</StatusChip>}
                    {!p.ativo && <StatusChip tone="zinc">Arquivado</StatusChip>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {p.sku ? `SKU ${p.sku} · ` : ""}
                    {variacoesPorProduto[p.id] ?? 0} variação(ões)
                    {p.preco_venda != null && ` · ${formatMoeda(p.preco_venda)}`}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-1">
                  <Link href={`/impressao-3d/produtos/${p.id}`} className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
                    Abrir
                  </Link>
                  {podeEditar && (
                    <>
                      <button
                        type="button"
                        disabled={pendente}
                        aria-label={p.ativo ? "Arquivar produto" : "Reativar produto"}
                        title={p.ativo ? "Arquivar" : "Reativar"}
                        onClick={() => executar(() => alternarProdutoAtivo(p.id, !p.ativo), { sucesso: p.ativo ? "Produto arquivado." : "Produto reativado." })}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
                      >
                        {p.ativo ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        disabled={pendente}
                        aria-label="Excluir produto"
                        onClick={() => executar(() => excluirProduto(p.id), { confirmar: `Excluir "${p.nome}" com variações e arquivos?`, sucesso: "Produto excluído." })}
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
