import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  ACESSO_VENDEDOR_CODIGO,
  VENDEDOR_HOME,
  getVendedorAcesso,
  isComercialSemVinculo,
  isRotaDeAcessoVendedor,
  isRotaDoVendedor,
} from "@/lib/vendedor-access";

// Exact-path routes usable without a session. Also the set a logged-in user
// gets bounced away from (see the `user && PUBLIC_ROUTES.includes(path)`
// check below) — that bounce must NOT apply to /convite/*, since an
// already-authenticated collaborator still needs to land on that page to
// accept/decline.
const PUBLIC_ROUTES = ["/login", "/signup"];
// Path prefixes usable without a session, but that a logged-in user may
// still need to visit (e.g. accepting an invite while already signed in).
const PUBLIC_ROUTE_PREFIXES = ["/convite/"];

function isPublicPath(path: string) {
  return (
    PUBLIC_ROUTES.includes(path) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Redirects must carry the cookies Supabase may have just refreshed,
  // otherwise the user is bounced with a stale session.
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !isPublicPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) return response;

  // A vendedor (active 'comercial' link, no company of their own) may only
  // use /vendedor/* — blocked here, in the proxy, so a typed URL or a stale
  // link can't reach another screen. RLS already stops them from writing
  // leads; this stops them from *reading* the owner-only screens.
  // A comercial account with no link yet is held even tighter: only the
  // screens to type the gestor's code and wait for approval.
  // /convite/* is exempt from both: accepting an invite is how a link starts.
  // The two access screens are also open to a linked vendedor: the "aguardando"
  // screen's server action is what notices the approval, and its POST reaches
  // the proxy after the link already exists — redirecting it here would
  // swallow the action's own redirect. Those pages send a linked vendedor on.
  const onPublicRoute = PUBLIC_ROUTES.includes(path);
  if (onPublicRoute || !isPublicPath(path)) {
    const acesso = await getVendedorAcesso(supabase, user.id);
    if (acesso.somenteVendedor) {
      if (onPublicRoute || !(isRotaDoVendedor(path) || isRotaDeAcessoVendedor(path))) {
        const url = request.nextUrl.clone();
        url.pathname = VENDEDOR_HOME;
        url.search = "";
        return redirectTo(url);
      }
    } else if (await isComercialSemVinculo(supabase, user, acesso)) {
      if (!isRotaDeAcessoVendedor(path)) {
        const url = request.nextUrl.clone();
        url.pathname = ACESSO_VENDEDOR_CODIGO;
        url.search = "";
        return redirectTo(url);
      }
    }
  }

  if (onPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/clientes";
    return redirectTo(url);
  }

  return response;
}
