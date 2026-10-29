import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Não roda em assets estáticos (_next/*, favicon e arquivos públicos por
  // extensão): o proxy consulta o banco e só interessa a páginas e APIs.
  matcher: [
    "/((?!_next/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|woff|woff2|ttf|otf|mp4|webm|pdf)$).*)",
  ],
};
