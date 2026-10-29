"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { ArrowLeft, Archive, ArchiveRestore, Download, FileBox, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import {
  Aviso, BotaoNovo, BotaoPrimario, BotaoTexto, Cartao, Entrada, ErroForm, Numero, Seletor,
  SomenteLeitura, Vazio, useAcao,
} from "@/components/impressao-3d/campos";
import { FormProduto } from "@/components/impressao-3d/produtos-board";
import {
  alternarProdutoAtivo, alternarVariacaoAtiva, atualizarVariacao, criarVariacao, excluirArquivoProduto,
  excluirVariacao, registrarArquivoProduto,
} from "@/app/(dashboard)/impressao-3d/produtos/actions";
import { urlDownloadArquivo } from "@/app/(dashboard)/impressao-3d/produtos/arquivos-leitura";
import {
  TIPO_ARQUIVO_ROTULO, type ArquivoProduto, type Produto, type TipoArquivo, type Variacao,
} from "@/lib/impressao-3d/tipos";
import type { OpcaoImpressora, OpcaoMaterial, Opcoes } from "@/lib/impressao-3d/opcoes";
import { LIMITE_BYTES, montarCaminho, tipoPorNome } from "@/lib/impressao-3d/arquivos";
import { BUCKET_P3D } from "@/lib/impressao-3d/storage-constantes";
import { formatBytes, formatHoras, formatMoeda, formatGramas } from "@/lib/impressao-3d/numeros";

function FormVariacao({
  produtoId,
  item,
  materiais,
  aoFechar,
}: {
  produtoId: string;
  item?: Variacao;
  materiais: Opcoes<OpcaoMaterial>;
  aoFechar: () => void;
}) {
  const acao = item ? atualizarVariacao.bind(null, produtoId, item.id) : criarVariacao.bind(null, produtoId);
  const [state, formAction, pendente] = useActionState(acao, undefined);
  useActionSuccess(state, aoFechar);
  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Entrada rotulo="Nome *" name="nome" required defaultValue={item?.nome} className="col-span-2" />
        <Entrada rotulo="SKU" name="sku" defaultValue={item?.sku ?? ""} />
        <Entrada rotulo="Cor" name="cor" defaultValue={item?.cor ?? ""} />
        <Entrada rotulo="Tamanho" name="tamanho" defaultValue={item?.tamanho ?? ""} />
        {materiais.acessivel ? (
          <Seletor rotulo="Material" name="material_id" defaultValue={item?.material_id ?? ""}>
            <option value="">Padrão do produto</option>
            {materiais.itens.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </Seletor>
        ) : (
          <input type="hidden" name="material_id" value={item?.material_id ?? ""} />
        )}
        <Numero rotulo="Peso (g)" name="peso_g" defaultValue={item?.peso_g ?? ""} />
        <Numero rotulo="Horas estimadas" name="horas_estimadas" defaultValue={item?.horas_estimadas ?? ""} />
        <Numero rotulo="Preço de venda (R$)" name="preco_venda" defaultValue={item?.preco_venda ?? ""} />
      </div>
      <ErroForm state={state} />
      <div className="flex justify-end gap-2">
        <BotaoTexto onClick={aoFechar}>Cancelar</BotaoTexto>
        <BotaoPrimario pendente={pendente}>{pendente ? "Salvando..." : "Salvar"}</BotaoPrimario>
      </div>
    </form>
  );
}

function SecaoVariacoes({
  produtoId,
  variacoes,
  materiais,
  podeEditar,
}: {
  produtoId: string;
  variacoes: Variacao[];
  materiais: Opcoes<OpcaoMaterial>;
  podeEditar: boolean;
}) {
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const { executar, pendente } = useAcao();
  const materialPorId = new Map(materiais.itens.map((m) => [m.id, m.nome]));

  return (
    <Cartao
      titulo={`Variações (${variacoes.length})`}
      acoes={
        podeEditar && !novo ? (
          <BotaoNovo onClick={() => setNovo(true)}>
            <Plus className="h-4 w-4" /> Nova variação
          </BotaoNovo>
        ) : undefined
      }
    >
      <div className="space-y-2">
        {novo && <FormVariacao produtoId={produtoId} materiais={materiais} aoFechar={() => setNovo(false)} />}
        {variacoes.length === 0 && !novo ? (
          <Vazio>Sem variações. Use para cores, tamanhos ou materiais diferentes do mesmo produto.</Vazio>
        ) : (
          variacoes.map((v) =>
            editando === v.id ? (
              <FormVariacao key={v.id} produtoId={produtoId} item={v} materiais={materiais} aoFechar={() => setEditando(null)} />
            ) : (
              <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    {v.nome}
                    {!v.ativo && <StatusChip tone="zinc">Arquivada</StatusChip>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {[
                      v.sku && `SKU ${v.sku}`,
                      v.cor,
                      v.tamanho,
                      v.material_id && materialPorId.get(v.material_id),
                      v.peso_g != null && formatGramas(v.peso_g),
                      v.horas_estimadas != null && formatHoras(v.horas_estimadas),
                      v.preco_venda != null && formatMoeda(v.preco_venda),
                    ].filter(Boolean).join(" · ") || "Sem detalhes"}
                  </p>
                </div>
                {podeEditar && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" aria-label="Editar variação" onClick={() => setEditando(v.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={pendente}
                      aria-label={v.ativo ? "Arquivar variação" : "Reativar variação"}
                      onClick={() => executar(() => alternarVariacaoAtiva(produtoId, v.id, !v.ativo))}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-60"
                    >
                      {v.ativo ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={pendente}
                      aria-label="Excluir variação"
                      onClick={() => executar(() => excluirVariacao(produtoId, v.id), { confirmar: `Excluir a variação "${v.nome}"?`, sucesso: "Variação excluída." })}
                      className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )
          )
        )}
      </div>
    </Cartao>
  );
}

function EnviarArquivo({
  workspaceId,
  produtoId,
  variacoes,
}: {
  workspaceId: string;
  produtoId: string;
  variacoes: Variacao[];
}) {
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoArquivo | "auto">("auto");
  const [variacaoId, setVariacaoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    const arquivo = entrada.current?.files?.[0];
    if (!arquivo) {
      setErro("Escolha um arquivo.");
      return;
    }
    if (arquivo.size > LIMITE_BYTES) {
      setErro("O arquivo passa do limite de 100 MB.");
      return;
    }
    setErro(null);
    setEnviando(true);
    const caminho = montarCaminho(workspaceId, produtoId, crypto.randomUUID(), arquivo.name);
    const storage = createClient().storage.from(BUCKET_P3D);
    try {
      const { error: erroEnvio } = await storage.upload(caminho, arquivo, {
        upsert: false,
        contentType: arquivo.type || undefined,
      });
      if (erroEnvio) {
        setErro(`Não foi possível enviar o arquivo: ${erroEnvio.message}`);
        return;
      }
      const resultado = await registrarArquivoProduto({
        produtoId,
        variacaoId: variacaoId || null,
        tipo: tipo === "auto" ? tipoPorNome(arquivo.name) : tipo,
        nome: arquivo.name,
        storagePath: caminho,
        tamanhoBytes: arquivo.size,
        mimeType: arquivo.type || null,
      });
      if (resultado && "error" in resultado) {
        await storage.remove([caminho]);
        setErro(resultado.error);
        return;
      }
      toast.success("Arquivo enviado.");
      if (entrada.current) entrada.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">Arquivo (até 100 MB)</label>
          <input
            ref={entrada}
            type="file"
            accept=".stl,.3mf,.gcode,.gco,.bgcode,image/*,.zip,.pdf,.step,.stp,.obj"
            className="w-full text-xs text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:text-zinc-200"
          />
        </div>
        <Seletor rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoArquivo | "auto")}>
          <option value="auto">Detectar pelo nome</option>
          {Object.entries(TIPO_ARQUIVO_ROTULO).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Seletor>
        <Seletor rotulo="Variação" value={variacaoId} onChange={(e) => setVariacaoId(e.target.value)}>
          <option value="">Produto inteiro</option>
          {variacoes.map((v) => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </Seletor>
      </div>
      {erro && <p className="text-xs text-rose-400">{erro}</p>}
      <div className="flex justify-end">
        <BotaoPrimario type="button" pendente={enviando} onClick={enviar}>
          <span className="flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" /> {enviando ? "Enviando..." : "Enviar arquivo"}
          </span>
        </BotaoPrimario>
      </div>
    </div>
  );
}

function SecaoArquivos({
  workspaceId,
  produtoId,
  arquivos,
  previews,
  variacoes,
  podeEditar,
}: {
  workspaceId: string;
  produtoId: string;
  arquivos: ArquivoProduto[];
  previews: Record<string, string>;
  variacoes: Variacao[];
  podeEditar: boolean;
}) {
  const toast = useToast();
  const { executar, pendente } = useAcao();
  const variacaoPorId = new Map(variacoes.map((v) => [v.id, v.nome]));
  const fotos = arquivos.filter((a) => a.tipo === "foto");
  const outros = arquivos.filter((a) => a.tipo !== "foto");

  async function baixar(id: string) {
    const r = await urlDownloadArquivo(id);
    if ("error" in r) {
      toast.error(r.error);
      return;
    }
    window.location.assign(r.url);
  }

  function botaoRemover(a: ArquivoProduto) {
    if (!podeEditar) return null;
    return (
      <button
        type="button"
        disabled={pendente}
        aria-label="Excluir arquivo"
        onClick={() => executar(() => excluirArquivoProduto(produtoId, a.id), { confirmar: `Excluir "${a.nome}"? O arquivo será apagado.`, sucesso: "Arquivo excluído." })}
        className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400 disabled:opacity-60"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <Cartao titulo={`Arquivos (${arquivos.length})`} icone={<FileBox className="h-4 w-4" />}>
      <div className="space-y-4">
        {podeEditar && <EnviarArquivo workspaceId={workspaceId} produtoId={produtoId} variacoes={variacoes} />}

        {fotos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {fotos.map((a) => (
              <div key={a.id} className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {previews[a.storage_path] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada temporária do storage privado
                  <img src={previews[a.storage_path]} alt={a.nome} className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-zinc-600">Sem preview</div>
                )}
                <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                  <p className="truncate text-[11px] text-zinc-400" title={a.nome}>{a.nome}</p>
                  <div className="flex shrink-0 items-center">
                    <button type="button" aria-label="Baixar foto" onClick={() => baixar(a.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {botaoRemover(a)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {outros.length > 0 && (
          <div className="space-y-2">
            {outros.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-200">
                    <span className="truncate">{a.nome}</span>
                    <StatusChip tone="copper">{TIPO_ARQUIVO_ROTULO[a.tipo]}</StatusChip>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(a.tamanho_bytes)}
                    {a.variacao_id && ` · variação ${variacaoPorId.get(a.variacao_id) ?? "—"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label="Baixar arquivo" onClick={() => baixar(a.id)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {botaoRemover(a)}
                </div>
              </div>
            ))}
          </div>
        )}

        {arquivos.length === 0 && <Vazio>Nenhum arquivo anexado (STL, 3MF, GCODE, fotos).</Vazio>}
      </div>
    </Cartao>
  );
}

export function ProdutoDetalhe({
  workspaceId,
  produto,
  variacoes,
  arquivos,
  previews,
  impressoras,
  materiais,
  podeEditar,
}: {
  workspaceId: string;
  produto: Produto;
  variacoes: Variacao[];
  arquivos: ArquivoProduto[];
  previews: Record<string, string>;
  impressoras: Opcoes<OpcaoImpressora>;
  materiais: Opcoes<OpcaoMaterial>;
  podeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const { executar, pendente } = useAcao();
  const impressora = impressoras.itens.find((i) => i.id === produto.impressora_id);
  const material = materiais.itens.find((m) => m.id === produto.material_id);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <div>
        <Link href="/impressao-3d/produtos" className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-3.5 w-3.5" /> Produtos e catálogo
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-zinc-100">
              {produto.nome}
              {produto.categoria && <StatusChip tone="copper">{produto.categoria}</StatusChip>}
              {!produto.ativo && <StatusChip tone="zinc">Arquivado</StatusChip>}
            </h1>
            <p className="text-sm text-zinc-500">{produto.sku ? `SKU ${produto.sku}` : "Sem SKU"}</p>
          </div>
          {podeEditar && (
            <div className="flex shrink-0 items-center gap-1">
              <BotaoTexto onClick={() => setEditando((v) => !v)}>{editando ? "Fechar edição" : "Editar"}</BotaoTexto>
              <BotaoTexto
                disabled={pendente}
                onClick={() => executar(() => alternarProdutoAtivo(produto.id, !produto.ativo), { sucesso: produto.ativo ? "Produto arquivado." : "Produto reativado." })}
              >
                {produto.ativo ? "Arquivar" : "Reativar"}
              </BotaoTexto>
            </div>
          )}
        </div>
      </div>
      {!podeEditar && <SomenteLeitura />}

      {editando ? (
        <FormProduto item={produto} impressoras={impressoras} materiais={materiais} aoFechar={() => setEditando(false)} />
      ) : (
        <Cartao titulo="Dados do produto">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              ["Preço de venda", produto.preco_venda != null ? formatMoeda(produto.preco_venda) : "—"],
              ["Peso estimado", produto.peso_estimado_g != null ? formatGramas(produto.peso_estimado_g) : "—"],
              ["Horas estimadas", produto.horas_estimadas != null ? formatHoras(produto.horas_estimadas) : "—"],
              ["Marcado para a loja", produto.publicado_loja ? "Sim" : "Não"],
              ["Impressora padrão", impressora?.nome ?? (produto.impressora_id && !impressoras.acessivel ? "(sem acesso)" : "—")],
              ["Material padrão", material?.nome ?? (produto.material_id && !materiais.acessivel ? "(sem acesso)" : "—")],
            ].map(([t, v]) => (
              <div key={t}>
                <dt className="text-xs text-zinc-500">{t}</dt>
                <dd className="text-zinc-200">{v}</dd>
              </div>
            ))}
            {produto.descricao && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-xs text-zinc-500">Descrição</dt>
                <dd className="whitespace-pre-wrap text-zinc-300">{produto.descricao}</dd>
              </div>
            )}
          </dl>
        </Cartao>
      )}

      <SecaoVariacoes produtoId={produto.id} variacoes={variacoes} materiais={materiais} podeEditar={podeEditar} />
      <SecaoArquivos
        workspaceId={workspaceId}
        produtoId={produto.id}
        arquivos={arquivos}
        previews={previews}
        variacoes={variacoes}
        podeEditar={podeEditar}
      />
      <Aviso>
        Os arquivos ficam em um armazenamento privado: o download usa um link temporário gerado na hora.
      </Aviso>
    </div>
  );
}
