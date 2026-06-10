type FooterQuickLink = { path?: string; label?: string };

export type FooterCmsPayload = {
  tagline?: string;
  logoUrl?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaPath?: string;
  quickLinks?: FooterQuickLink[];
  [key: string]: unknown;
};

/** Normalize footer/CMS internal paths (home = `/`, not `/Home`). */
export function normalizeFooterPath(raw: string): string {
  let path = String(raw ?? "").trim();
  if (!path) return "/";

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname || "/";
    } catch {
      return "/";
    }
  } else if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(path)) {
    path = path.slice(path.indexOf("/"));
  }

  if (!path.startsWith("/")) path = `/${path}`;
  if (path.toLowerCase() === "/home") return "/";
  return path;
}

export function normalizeFooterCms(body: FooterCmsPayload): FooterCmsPayload {
  const out: FooterCmsPayload = { ...body };

  if (typeof out.ctaPath === "string") {
    out.ctaPath = normalizeFooterPath(out.ctaPath);
  }

  if (Array.isArray(out.quickLinks)) {
    out.quickLinks = out.quickLinks.map((row) => {
      if (!row || typeof row !== "object") return row;
      const path = typeof row.path === "string" ? normalizeFooterPath(row.path) : row.path;
      return { ...row, path };
    });
  }

  return out;
}
