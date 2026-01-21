export type VideoProvider = "YOUTUBE" | "VIMEO";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
  canonicalUrl: string;
};

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function parseYouTubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0] || "";
    return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v") || "";
      return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
    }

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" && parts[1]) {
      const id = parts[1];
      return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
    }

    if (parts[0] === "shorts" && parts[1]) {
      const id = parts[1];
      return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
    }

    if (parts[0] === "live" && parts[1]) {
      const id = parts[1];
      return /^[a-zA-Z0-9_-]{6,20}$/.test(id) ? id : null;
    }
  }

  return null;
}

function parseVimeoId(u: URL): string | null {
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "vimeo.com") {
    const candidate = parts[0] || "";
    return /^\d{5,20}$/.test(candidate) ? candidate : null;
  }

  if (host === "player.vimeo.com") {
    if (parts[0] === "video" && parts[1]) {
      const candidate = parts[1];
      return /^\d{5,20}$/.test(candidate) ? candidate : null;
    }
  }

  return null;
}

export function parseVideoUrl(input: string): ParsedVideo | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  const u = safeUrl(raw);
  if (!u) return null;

  const yt = parseYouTubeId(u);
  if (yt) {
    return {
      provider: "YOUTUBE",
      id: yt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}`,
      canonicalUrl: `https://youtu.be/${yt}`,
    };
  }

  const vm = parseVimeoId(u);
  if (vm) {
    return {
      provider: "VIMEO",
      id: vm,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
      canonicalUrl: `https://vimeo.com/${vm}`,
    };
  }

  return null;
}

export function isSupportedVideoUrl(input: string): boolean {
  return !!parseVideoUrl(input);
}
