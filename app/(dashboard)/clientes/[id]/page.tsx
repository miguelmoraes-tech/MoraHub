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
import { AcessosSection } from "@/components/acessos-section";
import { InfraestruturaSection } from "@/components/infraestrutura-section";
import { ProjetosSection } from "@/components/projetos-section";
import { ManutencoesSection } from "@/components/manutencoes-section";
import type {
  Cliente,
  Contrato,
  Comprovante,
  Servico,
  Assinatura,
  Acesso,
  Infraestrutura,
  Projeto,
  Manutencao,
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
    { data: acessos },
    { data: infraestrutura },
    { data: projetos },
    { data: manutencoes },
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
      .from("acessos")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("infraestrutura")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("projetos")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("manutencoes")
      .select("*")
      .eq("cliente_id", id)
      .order("data", { ascending: false }),
  ])) as [
    { data: Cliente | null },
    { data: Contrato[] | null },
    { data: Comprovante[] | null },
    { data: Servico[] | null },
    { data: Assinatura[] | null },
    { data: Acesso[] | null },
    { data: Infraestrutura[] | null },
    { data: Projeto[] | null },
    { data: Manutencao[] | null },
  ];

  if (!cliente) notFound();

  const contratosList = contratos ?? [];
  const comprovantesList = comprovantes ?? [];
  const projetosList = projetos ?? [];

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
      <AssinaturasSection clienteId={id} assinaturas={assinaturas ?? []} />
      <ContratosSection clienteId={id} contratos={contratosComArquivo} />
      <ComprovantesSection clienteId={id} comprovantes={comprovantesComArquivo} />
      <ServicosSection clienteId={id} servicos={servicos ?? []} />
      <AcessosSection clienteId={id} acessos={acessos ?? []} />
      <InfraestruturaSection
        clienteId={id}
        infraestrutura={infraestrutura ?? []}
      />
      <ProjetosSection clienteId={id} projetos={projetosList} />
      <ManutencoesSection
        clienteId={id}
        manutencoes={manutencoes ?? []}
        projetos={projetosList}
      />
    </div>
  );
}
