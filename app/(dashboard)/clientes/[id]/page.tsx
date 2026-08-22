import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClienteArquivoSignedUrls } from "@/lib/supabase/storage";
import { ClienteForm } from "@/components/cliente-form";
import { ContratosSection } from "@/components/contratos-section";
import { ComprovantesSection } from "@/components/comprovantes-section";
import { ServicosSection } from "@/components/servicos-section";
import { AssinaturasSection } from "@/components/assinaturas-section";
import { PropostasSection } from "@/components/propostas-section";
import { LeadOrigemCard } from "@/components/lead-origem-card";
import type {
  Cliente,
  Contrato,
  Comprovante,
  Servico,
  Assinatura,
  Proposta,
} from "@/lib/types";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: cliente },
    { data: contratos },
    { data: comprovantes },
    { data: servicos },
    { data: assinaturas },
    { data: propostas },
  ] = (await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase
      .from("contratos")
      .select("*")
      .eq("cliente_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("comprovantes")
      .select("*")
      .eq("cliente_id", id)
      .order("data", { ascending: false }),
    supabase
      .from("servicos")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assinaturas")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("propostas")
      .select("*")
      .eq("cliente_id", id)
      .order("versao", { ascending: false }),
  ])) as [
    { data: Cliente | null },
    { data: Contrato[] | null },
    { data: Comprovante[] | null },
    { data: Servico[] | null },
    { data: Assinatura[] | null },
    { data: Proposta[] | null },
  ];

  if (!cliente) notFound();

  const { data: leadOrigem } = cliente.lead_origem_id
    ? ((await supabase
        .from("leads")
        .select("id, nome, descricao, nicho")
        .eq("id", cliente.lead_origem_id)
        .maybeSingle()) as {
        data: { id: string; nome: string; descricao: string | null; nicho: string | null } | null;
      })
    : { data: null };

  const contratosList = contratos ?? [];
  const comprovantesList = comprovantes ?? [];

  const signedUrls = await getClienteArquivoSignedUrls([
    ...contratosList.map((c) => c.arquivo_path),
    ...comprovantesList.map((c) => c.arquivo_path),
  ]);

  const contratosComArquivo = contratosList.map((contrato) => ({
    ...contrato,
    arquivoUrl: contrato.arquivo_path
      ? signedUrls.get(contrato.arquivo_path) ?? null
      : null,
  }));

  const comprovantesComArquivo = comprovantesList.map((comprovante) => ({
    ...comprovante,
    arquivoUrl: comprovante.arquivo_path
      ? signedUrls.get(comprovante.arquivo_path) ?? null
      : null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para clientes
      </Link>

      <ClienteForm cliente={cliente} />
      {leadOrigem && (
        <LeadOrigemCard lead={leadOrigem} convertidoEm={cliente.created_at} />
      )}
      <PropostasSection clienteId={id} propostas={propostas ?? []} />
      <AssinaturasSection clienteId={id} assinaturas={assinaturas ?? []} />
      <ContratosSection clienteId={id} contratos={contratosComArquivo} />
      <ComprovantesSection clienteId={id} comprovantes={comprovantesComArquivo} />
      <ServicosSection clienteId={id} servicos={servicos ?? []} />
    </div>
  );
}
