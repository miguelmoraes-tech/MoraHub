"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Faixas de abas (`data-faixa-abas`) rolam na horizontal no celular; esta peça mantém a aba ATIVA sempre
 * visível dentro da faixa, ao abrir a tela e depois de cada toque numa aba. Não muda nada no desktop (onde a
 * faixa cabe inteira, não há o que rolar).
 */
export function RolagemAbasAtiva() {
  const pathname = usePathname();

  useEffect(() => {
    function mostrarAtivas() {
      document.querySelectorAll<HTMLElement>("[data-faixa-abas]").forEach((faixa) => {
        if (faixa.scrollWidth <= faixa.clientWidth) return;
        faixa.querySelector<HTMLElement>(".bg-copper-600, [aria-current='page']")?.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "auto",
        });
      });
    }
    function aoClicar(e: MouseEvent) {
      if ((e.target as Element | null)?.closest("[data-faixa-abas]")) setTimeout(mostrarAtivas, 50);
    }
    const quadro = requestAnimationFrame(mostrarAtivas);
    document.addEventListener("click", aoClicar);
    return () => {
      cancelAnimationFrame(quadro);
      document.removeEventListener("click", aoClicar);
    };
  }, [pathname]);

  return null;
}
