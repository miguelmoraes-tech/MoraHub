"use client";

import { useSyncExternalStore } from "react";
import { MEDIA_BARRA_FIXA, type ModoSidebar } from "@/lib/sidebar-mobile";

function assinar(aoMudar: () => void): () => void {
  const mq = window.matchMedia(MEDIA_BARRA_FIXA);
  mq.addEventListener("change", aoMudar);
  return () => mq.removeEventListener("change", aoMudar);
}

/**
 * Modo da barra lateral pela largura da janela (mesma regra de `modoSidebar`): "fixa" a partir de 1024 px,
 * "gaveta" abaixo. No servidor vale "fixa" (o layout em CSS já esconde a gaveta no celular; o modo só liga
 * os comportamentos de JS: gesto, foco preso, trava de rolagem e onde ficam os sinos).
 */
export function useModoSidebar(): ModoSidebar {
  return useSyncExternalStore(
    assinar,
    () => (window.matchMedia(MEDIA_BARRA_FIXA).matches ? "fixa" : "gaveta"),
    () => "fixa"
  );
}
