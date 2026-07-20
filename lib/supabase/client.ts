import { createBrowserClient } from "@supabase/ssr";

// Note: the generated `Database` generic is intentionally not wired into the
// client. With tables of 3+ columns it triggers a TypeScript inference
// ceiling in @supabase/postgrest-js that collapses insert/update payload
// types to `never`. Rows are typed manually at the call site instead
// (see lib/types.ts).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
