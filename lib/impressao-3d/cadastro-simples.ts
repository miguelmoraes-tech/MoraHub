/**
 * Cadastros simples do nicho Impressão 3D (puro, testável): entrada de estoque por "rolos
 * comprados" no cadastro do material e saldo em rolos aproximados na lista.
 */

/** Dinheiro em centavos: evita 3 × 79,9 = 239,70000000000002 indo para o banco. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Entrada de estoque criada junto com o material: rolos × peso do rolo (g) e, quando há preço,
 * custo_total = rolos × preço pago. Zero rolos = só cadastra (null).
 */
export function entradaDeRolosComprados(d: {
  rolos: number;
  pesoRoloG: number;
  precoPago: number | null;
}): { gramas: number; custoTotal: number | null } | null {
  if (!(d.rolos > 0)) return null;
  return {
    gramas: d.rolos * d.pesoRoloG,
    custoTotal: d.precoPago != null && d.precoPago > 0 ? centavos(d.rolos * d.precoPago) : null,
  };
}

/** Saldo em rolos aproximados (g ÷ peso do rolo); null se não há peso de rolo ou a unidade não é g. */
export function saldoEmRolos(saldo: number, unidade: string, pesoRoloG: number | null): number | null {
  if (unidade !== "g" || pesoRoloG == null || !(pesoRoloG > 0)) return null;
  return saldo / pesoRoloG;
}
