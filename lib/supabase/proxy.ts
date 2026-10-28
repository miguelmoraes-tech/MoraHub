import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getVendedorAcesso, isComercialSemVinculo } from "@/lib/vendedor-access";
import { getModulosDaEmpresa } from "@/lib/modulos/habilitados";
import { getModulosPermiteMembrosDoCatalogo } from "@/lib/modulos/catalogo";
import { lerPermissoesProprias, modulosDasPermissoes } from "@/lib/modulos/permissoes";
import {
  EMPRESA_ATIVA_COOKIE,
  EMPRESA_ATIVA_COOKIE_MAX_AGE,
  UUID_RE,
  resolverEmpresaAtiva,
} from "@/lib/empresas";
import {
  ROTAS_DE_ENTRADA,
  decidirAcesso,
  isRotaIsenta,
  precisaDeModulos,
} from "@/lib/acesso";

// Exact-path routes usable without a session. Also the set a logged-in user
// gets bounced away from (see lib/acesso.ts) — that bounce must NOT apply to
// /convite/*, since an already-authenticated collaborator still needs to land
// on that page to accept/decline.
const PUBLIC_ROUTES = ROTAS_DE_ENTRADA;
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

  // Redirects must carry the cookies Supabase may have just refreshed (and the
  // empresa-ativa cookie, when regravado), otherwise the user is bounced with a
  // stale session.
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

  // Aceitar convite e a tela "Sem acesso" não dependem da empresa ativa.
  if (isRotaIsenta(path)) return response;

  // O que o usuário vê depende do PAPEL NA EMPRESA ATIVA (lib/acesso.ts): o
  // cookie guarda só o workspace_id e é sempre revalidado no banco
  // (meu_papel_na_empresa). Cookie ausente, forjado ou de vínculo encerrado cai
  // numa empresa válida e é regravado. Qualquer falha de consulta NEGA.
  const cookie = request.cookies.get(EMPRESA_ATIVA_COOKIE)?.value;
  const cookieValido = cookie && UUID_RE.test(cookie) ? cookie : undefined;
  const lerModulos = precisaDeModulos(path);

  // Papel e módulos do cookie saem em paralelo (uma ida ao banco de latência);
  // os módulos só valem se o papel confirmado for o de dono daquela empresa.
  const modulosDoCookie =
    cookieValido && lerModulos
      ? getModulosDaEmpresa(supabase, cookieValido).catch(() => [] as string[])
      : null;
  const resolucao = await resolverEmpresaAtiva(supabase, cookieValido);

  let habilitados: string[] = [];
  let permissoes: string[] = [];
  let permiteMembros: string[] = [];
  if (resolucao.status === "ok") {
    if (resolucao.corrigirCookie) {
      response.cookies.set(EMPRESA_ATIVA_COOKIE, resolucao.workspaceId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: EMPRESA_ATIVA_COOKIE_MAX_AGE,
      });
    }
    const painel = resolucao.papel === "dono" || resolucao.papel === "cofundador";
    const restrito = resolucao.papel === "socio" || resolucao.papel === "funcionario";
    if ((painel || restrito) && lerModulos) {
      // Sócio/funcionário: módulos da empresa ∩ as próprias permissões ∩ o que o
      // catálogo deixa para a equipe, lidos em paralelo. Falha em qualquer um =
      // lista vazia = nega.
      const [modulos, permitidos, catalogo] = await Promise.all([
        modulosDoCookie && resolucao.workspaceId === cookieValido
          ? modulosDoCookie
          : getModulosDaEmpresa(supabase, resolucao.workspaceId).catch(() => [] as string[]),
        restrito
          ? lerPermissoesProprias(supabase, resolucao.workspaceId, user.id)
          : Promise.resolve([]),
        restrito ? getModulosPermiteMembrosDoCatalogo(supabase) : Promise.resolve([] as string[]),
      ]);
      habilitados = modulos;
      permissoes = modulosDasPermissoes(permitidos);
      permiteMembros = catalogo;
    }
  }

  // Funcionário que ainda não entrou em nenhuma empresa nem criou a sua: fica
  // nas telas do código. Só consulta quando a conta não tem empresa alguma.
  let funcionarioSemVinculo = false;
  if (
    resolucao.status === "sem_empresa" &&
    user.user_metadata?.tipo_conta_padrao === "comercial"
  ) {
    try {
      const acesso = await getVendedorAcesso(supabase, user.id);
      funcionarioSemVinculo = await isComercialSemVinculo(supabase, user, acesso);
    } catch {
      // Sem conseguir confirmar, o mais restrito: só as telas do código.
      funcionarioSemVinculo = true;
    }
  }

  const decisao = decidirAcesso({
    path,
    resolucao,
    habilitados,
    permissoes,
    permiteMembros,
    funcionarioSemVinculo,
  });
  if (decisao.tipo === "redirecionar") {
    const url = request.nextUrl.clone();
    const [pathname, search] = decisao.para.split("?");
    url.pathname = pathname;
    url.search = search ? `?${search}` : "";
    return redirectTo(url);
  }

  return response;
}
