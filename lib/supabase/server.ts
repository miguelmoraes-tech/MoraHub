import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Note: the generated `Database` generic is intentionally not wired into the
// client. With tables of 3+ columns it triggers a TypeScript inference
// ceiling in @supabase/postgrest-js that collapses insert/update payload
// types to `never`. Rows are typed manually at the call site instead
// (see lib/types.ts).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no write access to cookies.
            // Safe to ignore because the proxy refreshes the session cookies.
          }
        },
      },
    }
  );
}
