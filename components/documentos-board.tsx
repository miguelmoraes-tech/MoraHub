"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Paperclip,
  FileSignature,
  UserPlus,
  X,
  FileStack,
  Search,
} from "lucide-react";
import type {
  Cliente,
  Documento,
  DocumentoCategoria,
  ModeloContrato,
  Signatario,
  StatusAssinatura,
} from "@/lib/types";
import {
  createDocumento,
  updateDocumento,
  deleteDocumento,
} from "@/app/(dashboard)/documentos/actions";
import { formatDate } from "@/lib/format";
import { useActionSuccess } from "@/lib/hooks/use-action-success";
import { StatusChip, type ChipTone } from "@/components/status-chip";
import { SegmentFilter } from "@/components/segment-filter";

export type DocumentoComArquivo = Documento & { arquivoUrl: string | null };

const CATEGORIAS: DocumentoCategoria[] = [
  "Contrato",
  "Proposta",
  "Briefing",
  "Nota fiscal",
  "Arquivo do cliente",
  "Outro",
];

const TIPO_OPTIONS = ["Link", "Nota"];

const STATUS_ASSINATURA_LABEL: Record<StatusAssinatura, string> = {
  pendente: "Assinatura pendente",
  assinado: "Assinado",
  recusado: "Assinatura recusada",
};

const STATUS_ASSINATURA_TONE: Record<StatusAssinatura, ChipTone> = {
  pendente: "amber",
  assinado: "emerald",
  recusado: "rose",
};

function ModeloSelectorPanel({
  modelos,
  onSelect,
  onClose,
}: {
  modelos: ModeloContrato[];
  onSelect: (modelo: ModeloContrato) => void;
  onClose: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");

  const categorias = useMemo(
    () =>
      [...new Set(modelos.map((m) => m.categoria).filter((c): c is string => !!c))].sort(
        (a, b) => a.localeCompare(b)
      ),
    [modelos]
  );

  const filtrados = modelos.filter((modelo) => {
    if (categoria && modelo.categoria !== categoria) return false;
    if (busca && !modelo.titulo.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 sm:col-span-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar modelo"
              className="bg-transparent text-xs text-zinc-300 outline-none placeholder:text-zinc-600"
            />
          </div>
          {categorias.length > 0 && (
            <SegmentFilter
              value={categoria}
              options={categorias}
              allLabel="Todas as categorias"
              onChange={setCategoria}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-56 space-y-1.5 overflow-y-auto">
        {filtrados.length > 0 ? (
          filtrados.map((modelo) => (
            <button
              key={modelo.id}
              type="button"
              onClick={() => onSelect(modelo)}
              className="flex w-full flex-col gap-1 rounded-lg border border-zinc-800/80 px-3 py-2 text-left hover:border-copper-600/60 hover:bg-zinc-900"
            >
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-200">
                {modelo.titulo}
                {modelo.categoria && (
                  <StatusChip tone="copper">{modelo.categoria}</StatusChip>
                )}
              </span>
              {modelo.conteudo && (
                <span className="line-clamp-1 text-xs text-zinc-500">
                  {modelo.conteudo}
                </span>
              )}
            </button>
          ))
        ) : (
          <p className="text-xs text-zinc-600">Nenhum modelo encontrado.</p>
        )}
      </div>
    </div>
  );
}

function DocumentoFields({
  documento,
  clientes,
  modelos = [],
  clientesIndisponiveis = false,
}: {
  documento?: Documento;
  clientes: Cliente[];
  modelos?: ModeloContrato[];
  /** Sem permissão em Clientes: o vínculo com o cliente não é mostrado nem alterado. */
  clientesIndisponiveis?: boolean;
}) {
  const [tipo, setTipo] = useState<"link" | "nota">(documento?.tipo ?? "link");
  const [precisaAssinatura, setPrecisaAssinatura] = useState(
    documento?.precisa_assinatura ?? false
  );
  const [signatarios, setSignatarios] = useState<Signatario[]>(
    documento?.signatarios ?? []
  );
  const [modeloSelectorOpen, setModeloSelectorOpen] = useState(false);
  const [templateConteudo, setTemplateConteudo] = useState<string | undefined>(
    undefined
  );

  function handleSelectModelo(modelo: ModeloContrato) {
    setTipo("nota");
    setTemplateConteudo(modelo.conteudo ?? "");
    setModeloSelectorOpen(false);
  }

  function addSignatario() {
    setSignatarios((prev) => [...prev, { nome: "", email: "", assinado: false }]);
  }

  function updateSignatario(index: number, patch: Partial<Signatario>) {
    setSignatarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  function removeSignatario(index: number) {
    setSignatarios((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {!documento && modelos.length > 0 && (
        <div className="col-span-2 sm:col-span-4">
          {modeloSelectorOpen ? (
            <ModeloSelectorPanel
              modelos={modelos}
              onSelect={handleSelectModelo}
              onClose={() => setModeloSelectorOpen(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setModeloSelectorOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <FileStack className="h-3.5 w-3.5" />
              Começar a partir de um modelo
            </button>
          )}
        </div>
      )}
      <div className="col-span-2 space-y-1">
        <label className="text-xs font-medium text-zinc-400">Título *</label>
        <input
          name="titulo"
          required
          defaultValue={documento?.titulo}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Tipo</label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "link" | "nota")}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="link">Link</option>
          <option value="nota">Nota</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Categoria</label>
        <select
          name="categoria"
          defaultValue={documento?.categoria ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        >
          <option value="">Nenhuma</option>
          {CATEGORIAS.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
      </div>
      {!clientesIndisponiveis && (
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-medium text-zinc-400">
            Cliente (opcional)
          </label>
          <select
            name="cliente_id"
            defaultValue={documento?.cliente_id ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          >
            <option value="">Documento geral (sem cliente)</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-400">Data</label>
        <input
          name="data"
          type="date"
          defaultValue={documento?.data ?? ""}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          {tipo === "link" ? "URL do link" : "Nota"}
        </label>
        {tipo === "link" ? (
          <input
            name="conteudo"
            defaultValue={documento?.conteudo ?? ""}
            placeholder="https://..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        ) : (
          <textarea
            name="conteudo"
            rows={templateConteudo ? 10 : 2}
            key={templateConteudo ?? "conteudo"}
            defaultValue={documento?.conteudo ?? templateConteudo ?? ""}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
          />
        )}
      </div>
      <div className="col-span-2 space-y-1 sm:col-span-4">
        <label className="text-xs font-medium text-zinc-400">
          Arquivo {documento?.arquivo_path ? "(substituir)" : "(opcional)"}
        </label>
        <input
          name="arquivo"
          type="file"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-400 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-zinc-200 focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
        />
      </div>

      <div className="col-span-2 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 sm:col-span-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="precisa_assinatura"
            checked={precisaAssinatura}
            onChange={(e) => setPrecisaAssinatura(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
          />
          <FileSignature className="h-3.5 w-3.5 text-zinc-500" />
          Precisa de assinatura eletrônica
        </label>

        {precisaAssinatura && (
          <div className="space-y-3 pl-6">
            <input
              type="hidden"
              name="signatarios"
              value={JSON.stringify(signatarios)}
            />
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400">
                Status da assinatura
              </label>
              <select
                name="status_assinatura"
                defaultValue={documento?.status_assinatura ?? "pendente"}
                className="w-full max-w-48 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
              >
                <option value="pendente">Pendente</option>
                <option value="assinado">Assinado</option>
                <option value="recusado">Recusado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">
                Signatários
              </label>
              {signatarios.map((signatario, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    placeholder="Nome"
                    value={signatario.nome}
                    onChange={(e) =>
                      updateSignatario(index, { nome: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                  />
                  <input
                    placeholder="E-mail"
                    type="email"
                    value={signatario.email}
                    onChange={(e) =>
                      updateSignatario(index, { email: e.target.value })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm outline-none focus:border-copper-500 focus:ring-1 focus:ring-copper-500"
                  />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={signatario.assinado}
                      onChange={(e) =>
                        updateSignatario(index, { assinado: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 accent-copper-600"
                    />
                    assinou
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSignatario(index)}
                    className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSignatario}
                className="flex items-center gap-1.5 text-xs font-medium text-copper-400 hover:text-copper-300"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar signatário
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewDocumentoForm({
  clientes,
  modelos,
  clientesIndisponiveis,
}: {
  clientes: Cliente[];
  modelos: ModeloContrato[];
  clientesIndisponiveis: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createDocumento,
    undefined
  );

  useActionSuccess(state, () => setOpen(false));

  useEffect(() => {
    if (!open) formRef.current?.reset();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-copper-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-copper-500"
      >
        <Plus className="h-4 w-4" />
        Novo documento
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
    >
      <DocumentoFields
        clientes={clientes}
        modelos={modelos}
        clientesIndisponiveis={clientesIndisponiveis}
      />
      {state && "error" in state && (
        <p className="text-xs text-rose-400">{state.error}</p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

function DocumentoRow({
  documento,
  clientes,
  somenteLeitura,
  clientesIndisponiveis,
  semLinkCliente,
}: {
  documento: DocumentoComArquivo;
  clientes: Cliente[];
  somenteLeitura: boolean;
  clientesIndisponiveis: boolean;
  semLinkCliente: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const action = updateDocumento.bind(null, documento.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useActionSuccess(state, () => setEditing(false));

  if (editing) {
    return (
      <form
        action={formAction}
        className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
      >
        <DocumentoFields
          documento={documento}
          clientes={clientes}
          clientesIndisponiveis={clientesIndisponiveis}
        />
        {state && "error" in state && (
          <p className="text-xs text-rose-400">{state.error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-copper-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-copper-500 disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  const cliente = clientes.find((c) => c.id === documento.cliente_id);

  return (
    <div
      id={`documento-${documento.id}`}
      className="scroll-mt-6 flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 px-3 py-2.5"
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {documento.titulo}
          {documento.categoria && (
            <StatusChip tone="copper">{documento.categoria}</StatusChip>
          )}
          {documento.precisa_assinatura && (
            <StatusChip tone={STATUS_ASSINATURA_TONE[documento.status_assinatura ?? "pendente"]}>
              {STATUS_ASSINATURA_LABEL[documento.status_assinatura ?? "pendente"]}
            </StatusChip>
          )}
        </p>
        <p className="truncate text-xs text-zinc-500">
          {cliente ? (
            semLinkCliente ? (
              cliente.nome
            ) : (
              <Link
                href={`/clientes/${cliente.id}`}
                className="hover:text-copper-400 hover:underline"
              >
                {cliente.nome}
              </Link>
            )
          ) : documento.cliente_id && clientesIndisponiveis ? (
            "Cliente: —"
          ) : (
            "Documento geral"
          )}
          {documento.data && ` · ${formatDate(documento.data)}`}
          {documento.tipo === "nota" && documento.conteudo && ` · ${documento.conteudo}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {documento.tipo === "link" && documento.conteudo && (
          <a
            href={documento.conteudo}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {documento.arquivoUrl && (
          <a
            href={documento.arquivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </a>
        )}
        {!somenteLeitura && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <form action={deleteDocumento.bind(null, documento.id)}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-zinc-500 hover:bg-rose-950/50 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export function DocumentosBoard({
  documentos,
  clientes,
  modelos,
  somenteLeitura = false,
  clientesIndisponiveis = false,
  semLinkCliente = false,
}: {
  documentos: DocumentoComArquivo[];
  clientes: Cliente[];
  modelos: ModeloContrato[];
  somenteLeitura?: boolean;
  /** Sem permissão em Clientes: o cliente aparece como "—" e o vínculo não é alterado. */
  clientesIndisponiveis?: boolean;
  /** O detalhe do cliente (/clientes/[id]) é só do fundador/cofundador. */
  semLinkCliente?: boolean;
}) {
  const [categoria, setCategoria] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"" | "link" | "nota">("");

  const porCategoria = categoria
    ? documentos.filter((d) => d.categoria === categoria)
    : documentos;
  const filtrados = tipoFiltro
    ? porCategoria.filter((d) => d.tipo === tipoFiltro)
    : porCategoria;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Documentos</h1>
          <p className="text-sm text-zinc-500">
            {filtrados.length} documento(s)
          </p>
        </div>
        {!somenteLeitura && (
          <NewDocumentoForm
            clientes={clientes}
            modelos={modelos}
            clientesIndisponiveis={clientesIndisponiveis}
          />
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <SegmentFilter
          value={categoria}
          options={CATEGORIAS}
          allLabel="Todas as categorias"
          onChange={setCategoria}
        />
        <SegmentFilter
          value={tipoFiltro === "link" ? "Link" : tipoFiltro === "nota" ? "Nota" : ""}
          options={TIPO_OPTIONS}
          allLabel="Todos os tipos"
          onChange={(value) =>
            setTipoFiltro(value === "Link" ? "link" : value === "Nota" ? "nota" : "")
          }
        />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileText className="h-4 w-4 text-zinc-500" />
          Todos os documentos
        </div>

        {filtrados.length > 0 ? (
          <div className="space-y-2">
            {filtrados.map((documento) => (
              <DocumentoRow
                key={documento.id}
                documento={documento}
                clientes={clientes}
                somenteLeitura={somenteLeitura}
                clientesIndisponiveis={clientesIndisponiveis}
                semLinkCliente={semLinkCliente}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Nenhum documento cadastrado.</p>
        )}
      </div>
    </div>
  );
}
