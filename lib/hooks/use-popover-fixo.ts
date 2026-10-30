"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Posição (position: fixed) de um popover que sai de dentro de uma área rolável. Dentro de um contêiner com
 * overflow o popover absoluto seria cortado; fixed não é. Parte do pai marcado com `data-sidebar-header`
 * (o cabeçalho da barra) e acompanha rolagem e redimensionamento enquanto está aberto.
 */
export function usePopoverFixo(ref: RefObject<HTMLElement | null>, aberto: boolean): { top: number; left: number } {
  const [pos, setPos] = useState({ top: 64, left: 12 });

  useEffect(() => {
    if (!aberto) return;
    function calcular() {
      const alvo = ref.current?.closest<HTMLElement>("[data-sidebar-header]") ?? ref.current;
      if (!alvo) return;
      const r = alvo.getBoundingClientRect();
      setPos({ top: Math.round(r.bottom), left: Math.round(r.left) + 12 });
    }
    calcular();
    window.addEventListener("resize", calcular);
    // Captura: a rolagem da barra não borbulha até a janela.
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [ref, aberto]);

  return pos;
}
