/**
 * Checks that a source link opens (principle 1: links are verified before
 * being shown as sources). Follows redirects; any 2xx/3xx final answer counts.
 */
export async function linkOpens(url: string, timeoutMs = 15000): Promise<boolean> {
  // One retry after a short pause: transient network errors are common.
  if (await tryOnce(url, timeoutMs)) return true;
  await new Promise((r) => setTimeout(r, 1500));
  return tryOnce(url, timeoutMs);
}

async function tryOnce(url: string, timeoutMs: number): Promise<boolean> {
  const attempt = async (method: "HEAD" | "GET") => {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "Mozilla/5.0 (EstudioTeologico link check)" },
    });
    // Drain/cancel the body so connections are released.
    await res.body?.cancel().catch(() => {});
    return res.status < 400;
  };
  try {
    // Some servers reject HEAD; fall back to GET before giving up.
    return (await attempt("HEAD")) || (await attempt("GET"));
  } catch {
    try {
      return await attempt("GET");
    } catch {
      return false;
    }
  }
}
