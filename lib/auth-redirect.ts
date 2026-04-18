const AUTH_PATHS = new Set(["/login", "/signup"]);

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function sanitizePostAuthRedirectPath(input: string | null | undefined) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "http://resumeforge.local");
    const pathname = normalizePathname(parsed.pathname);

    if (AUTH_PATHS.has(pathname)) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
