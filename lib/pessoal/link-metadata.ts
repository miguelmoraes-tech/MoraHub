import type { PessoalLibraryItemType } from "@/lib/pessoal/types";

export type LinkMetadata = {
  title: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  itemType: PessoalLibraryItemType;
};

function isYoutubeUrl(url: string) {
  try {
    const { hostname } = new URL(url);
    return /(^|\.)youtube\.com$/i.test(hostname) || /(^|\.)youtu\.be$/i.test(hostname);
  } catch {
    return false;
  }
}

async function fetchYoutubeMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
      description: null,
      itemType: "video",
    };
  } catch {
    return null;
  }
}

async function fetchOpenGraphMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const res = await fetch(
      `/api/pessoal/link-metadata?url=${encodeURIComponent(url)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? null,
      thumbnailUrl: data.image ?? null,
      description: data.description ?? null,
      itemType: "link",
    };
  } catch {
    return null;
  }
}

/** Never throws — returns null on any failure so the caller can fall back to manual entry. */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata | null> {
  if (isYoutubeUrl(url)) return fetchYoutubeMetadata(url);
  return fetchOpenGraphMetadata(url);
}
