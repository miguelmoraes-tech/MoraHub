import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClienteForm } from "@/components/cliente-form";
import { ContratosSection } from "@/components/contratos-section";
import { ComprovantesSection } from "@/components/comprovantes-section";
import { ServicosSection } from "@/components/servicos-section";
import type { Cliente, Contrato, Comprovante, Servico } from "@/lib/types";

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
  ])) as [
    { data: Cliente | null },
    { data: Contrato[] | null },
    { data: Comprovante[] | null },
    { data: Servico[] | null },
  ];

  if (!cliente) notFound();

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
      <ContratosSection clienteId={id} contratos={contratos ?? []} />
      <ComprovantesSection clienteId={id} comprovantes={comprovantes ?? []} />
      <ServicosSection clienteId={id} servicos={servicos ?? []} />
    </div>
  );
}
