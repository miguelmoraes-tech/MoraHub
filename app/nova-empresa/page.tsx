import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { temEmpresaPropria } from "@/lib/perfil";
import { HOME_DONO } from "@/lib/modulos/registry";
import { NovaEmpresaForm } from "@/components/empresa/nova-empresa-form";

export default async function NovaEmpresaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Hoje cada conta tem uma empresa; várias empresas entram na Fase 2.
  if (await temEmpresaPropria(supabase, user.id)) redirect(HOME_DONO);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-copper-400 text-zinc-950">
          <Building2 className="h-5 w-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
          Dê um nome à sua empresa
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Você pode trocar depois. Em seguida você escolhe quais módulos usar.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg shadow-black/20">
        <NovaEmpresaForm />
      </div>

      <p className="text-center text-xs text-zinc-600">
        Conectado como <span className="text-zinc-400">{user.email}</span>
      </p>
    </div>
  );
}
