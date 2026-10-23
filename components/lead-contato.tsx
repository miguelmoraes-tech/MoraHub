/**
 * The only place a lead's contact (phone / WhatsApp) is rendered. The list
 * card and the detail dialog both go through here, so hiding the contact
 * from vendedores until they open the lead is a one-line change: pass
 * `oculto` for the list ("card") variant — see LeadCard.
 */
export function LeadContato({
  contato,
  variant,
  oculto = false,
}: {
  contato: string | null;
  variant: "card" | "detalhe";
  /** Hide the value (list card only; the detail view always shows it). */
  oculto?: boolean;
}) {
  if (variant === "card") {
    if (!contato || oculto) return null;
    return <p className="truncate text-xs text-zinc-500">{contato}</p>;
  }

  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">Contato</dt>
      <dd className="text-sm text-zinc-200">{contato || "Não informado"}</dd>
    </div>
  );
}
