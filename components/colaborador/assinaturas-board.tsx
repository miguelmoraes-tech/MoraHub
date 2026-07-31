import { ExternalLink, FileSignature, Paperclip } from "lucide-react";
import type { Documento, StatusAssinatura } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { StatusChip, type ChipTone } from "@/components/status-chip";

export type DocumentoParaAssinatura = Documento & {
  clienteNome: string;
  donoNome: string;
  arquivoUrl: string | null;
};

const STATUS_LABEL: Record<StatusAssinatura, string> = {
  pendente: "Pendente",
  assinado: "Assinado",
  recusado: "Recusado",
};

const STATUS_TONE: Record<StatusAssinatura, ChipTone> = {
  pendente: "amber",
  assinado: "emerald",
  recusado: "rose",
};

function DocumentoRow({ documento }: { documento: DocumentoParaAssinatura }) {
  const status = documento.status_assinatura ?? "pendente";
  const assinados = documento.signatarios.filter((s) => s.assinado).length;

  return (
    <div className="rounded-lg border border-zinc-800/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm text-zinc-200">
          {documento.titulo}
          <StatusChip tone={STATUS_TONE[status]}>
            {STATUS_LABEL[status]}
          </StatusChip>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {documento.link_assinatura && (
            <a
              href={documento.link_assinatura}
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
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500">
        {documento.clienteNome} · {documento.donoNome}
        {documento.data && ` · ${formatDate(documento.data)}`}
        {documento.signatarios.length > 0 &&
          ` · ${assinados}/${documento.signatarios.length} assinaram`}
      </p>
      {documento.signatarios.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {documento.signatarios.map((signatario) => (
            <span
              key={signatario.email}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                signatario.assinado
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              {signatario.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AssinaturasBoard({
  documentos,
}: {
  documentos: DocumentoParaAssinatura[];
}) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">
          Documentos para assinatura
        </h1>
        <p className="text-sm text-zinc-500">
          {documentos.length} documento(s) em fluxo de assinatura
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileSignature className="h-4 w-4 text-zinc-500" />
          Todos os clientes vinculados
        </div>

        {documentos.length > 0 ? (
          <div className="space-y-2">
            {documentos.map((documento) => (
              <DocumentoRow key={documento.id} documento={documento} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            Nenhum documento em fluxo de assinatura no momento.
          </p>
        )}
      </div>
    </div>
  );
}
