// Which photo links from an imported CSV the server may fetch (see the import photo route).

export function safePhotoUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  const host = url.hostname.toLowerCase();
  // No IP addresses and no local or internal names: photo links point at public websites.
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null;
  if (host === "localhost" || !host.includes(".") || /\.(local|localhost|internal|lan|home|corp|test|invalid)$/.test(host)) return null;
  // Google Drive "view" links become direct downloads.
  const drive = /^\/file\/d\/([\w-]+)/.exec(url.pathname);
  if ((host === "drive.google.com" || host === "docs.google.com") && drive) {
    return new URL(`https://drive.google.com/uc?export=download&id=${drive[1]}`);
  }
  return url;
}
