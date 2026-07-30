import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  if (user && PUBLIC_ROUTES.includes(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/clientes";
    return NextResponse.redirect(url);
  }

  return response;
}
