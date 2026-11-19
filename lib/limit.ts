// Best-effort per-IP limit so a shared demo link cannot drain the API key.
// It lives in instance memory, so on serverless it resets with each cold start;
// a spend cap on the key is the real backstop.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 80;
const hits = new Map<string, number[]>();

export function rateLimited(req: Request): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return Response.json({ error: "rate_limit", message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return null;
}
