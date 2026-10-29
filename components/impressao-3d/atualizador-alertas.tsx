"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { atualizarAlertasLimitado } from "@/components/impressao-3d/alertas-cliente";

/**
 * Sem interface: ao abrir o Dashboard ou a tela de notificações, pede a atualização dos alertas
 * (com o limite de frequência do cliente). `recarregar` refaz a página do servidor quando a lista
 * dela depende dos alertas (notificações).
 */
export function AtualizadorAlertas({ empresaId, recarregar = false }: { empresaId: string; recarregar?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    let ativo = true;
    atualizarAlertasLimitado(empresaId).then((r) => {
      if (ativo && recarregar && r && "ok" in r) router.refresh();
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, recarregar, router]);
  return null;
}
