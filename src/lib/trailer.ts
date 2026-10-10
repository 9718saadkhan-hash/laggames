export type TrailerSource = { kind: "embed" | "video"; url: string };

/** Only supported HTTPS players and video files can run inside the lightbox. */
export function trailerSource(value?: string | null): TrailerSource | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be"
        ? url.pathname.split("/")[1]
        : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
      if (!id || !/^[\w-]{11}$/.test(id)) return null;
      return { kind: "embed", url: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
      if (!id) return null;
      const player = new URL(`https://player.vimeo.com/video/${id}`);
      player.searchParams.set("autoplay", "1");
      const hash = url.searchParams.get("h");
      if (hash) player.searchParams.set("h", hash);
      return { kind: "embed", url: player.toString() };
    }
    if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return { kind: "video", url: url.toString() };
    return null;
  } catch {
    return null;
  }
}