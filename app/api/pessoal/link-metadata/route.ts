import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1|172\.(1[6-9]|2\d|3[01])\.)/i;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url é obrigatória" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  if (PRIVATE_HOSTNAME_RE.test(parsed.hostname)) {
    return NextResponse.json({ error: "host não permitido" }, { status: 400 });
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MoraHubBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "falha ao buscar a página" },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "conteúdo não é HTML" },
        { status: 415 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ??
      $('meta[name="og:title"]').attr("content") ??
      $("title").text().trim() ??
      null;
    const image = $('meta[property="og:image"]').attr("content") ?? null;
    const description =
      $('meta[property="og:description"]').attr("content") ??
      $('meta[name="description"]').attr("content") ??
      null;

    return NextResponse.json({ title: title || null, image, description });
  } catch {
    return NextResponse.json(
      { error: "erro ao processar a página" },
      { status: 502 }
    );
  }
}
