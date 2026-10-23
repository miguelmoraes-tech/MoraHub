import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireComercialSemVinculo } from "@/lib/vendedor";
import { ACESSO_VENDEDOR_AGUARDANDO } from "@/lib/vendedor-access";
import { CodigoVendedorForm } from "@/components/vendedor/codigo-vendedor-form";

export default async function CodigoDoGestorPage() {
  const { email, ultima } = await requireComercialSemVinculo();
  if (ultima?.status === "pendente") redirect(ACESSO_VENDEDOR_AGUARDANDO);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-teal-400 text-zinc-950">
          <KeyRound className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          Digite o código do seu gestor
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Peça o código ao dono da empresa. Ele aprova o seu acesso em seguida.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
        <CodigoVendedorForm />
      </div>

      <p className="text-center text-xs text-zinc-600">
        Conectado como <span className="text-zinc-400">{email}</span>
      </p>
    </div>
  );
}
