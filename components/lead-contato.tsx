import { MessageCircle } from "lucide-react";

/**
 * The only place a lead's contact (phone / WhatsApp) is rendered. The list
 * card and the detail dialog both go through here, so hiding the contact
 * from vendedores until they open the lead is a one-line change: pass
 * `oculto` for the list ("card") variant — see LeadCard.
 *
 * When the value looks like a phone number it becomes a `tel:` link plus a
 * WhatsApp link; the stored value is never altered.
 */

type Telefone = { tel: string; whatsapp: string };

/**
 * Recognises a phone number: only digits and the usual separators, 10–13
 * digits. Anything else (e-mail, @instagram, free text) is shown as plain text.
 */
function parseTelefone(contato: string): Telefone | null {
  const texto = contato.trim();
  if (!/^\+?[\d\s().-]+$/.test(texto)) return null;
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) return null;
  // wa.me needs the country code; a Brazilian number typed without it
  // (DDD + 8/9 digits) gets 55 in the link only.
  const internacional = digitos.length <= 11 ? `55${digitos}` : digitos;
  return {
    tel: texto.startsWith("+") ? `+${digitos}` : digitos,
    whatsapp: internacional,
  };
}

function ContatoValor({ contato }: { contato: string }) {
  const telefone = parseTelefone(contato);
  if (!telefone) return <>{contato}</>;

  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <a
        href={`tel:${telefone.tel}`}
        className="truncate hover:text-zinc-200 hover:underline"
      >
        {contato}
      </a>
      <a
        href={`https://wa.me/${telefone.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir no WhatsApp"
        className="inline-flex shrink-0 items-center gap-1 text-emerald-400 hover:text-emerald-300"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </a>
    </span>
  );
}

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
    return (
      <p className="truncate text-xs text-zinc-500">
        <ContatoValor contato={contato} />
      </p>
    );
  }

  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">Contato</dt>
      <dd className="text-sm text-zinc-200">
        {contato ? <ContatoValor contato={contato} /> : "Não informado"}
      </dd>
    </div>
  );
}
