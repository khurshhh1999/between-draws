// Best-effort limits so a shared demo link cannot drain the API key. Counters
// live in instance memory, so on serverless they reset with each cold start;
// a spend cap on the key is the real backstop.
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function over(bucket: string, max: number, now: number): boolean {
  const recent = (hits.get(bucket) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(bucket, recent);
    return true;
  }
  recent.push(now);
  hits.set(bucket, recent);
  // Bound memory by dropping the oldest entry, never the whole table.
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return false;
}

// `kind` separates conversation from red-team runs; each has a per-visitor
// budget, and everything shares one ceiling for the whole instance.
export function rateLimited(req: Request, kind: "turn" | "eval"): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const perVisitor = kind === "eval" ? 75 : 40;
  if (over(`all:${kind}`, kind === "eval" ? 300 : 400, now) || over(`${kind}:${ip}`, perVisitor, now)) {
    return Response.json({ error: "rate_limit", message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  return null;
}
