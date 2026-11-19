// Best-effort limits so a shared demo link cannot drain the API key. Counters
// live in instance memory, so on serverless they reset with each cold start;
// a spend cap on the key is the real backstop.
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function recent(bucket: string, now: number): number[] {
  const list = (hits.get(bucket) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.set(bucket, list);
  return list;
}

// `kind` separates conversation from red-team runs; each has a per-visitor
// budget, and everything shares one ceiling for the whole instance.
export function rateLimited(req: Request, kind: "turn" | "eval"): Response | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const now = Date.now();
  const perVisitor = kind === "eval" ? 75 : 40;
  const mine = recent(`${kind}:${ip}`, now);
  const everyone = recent(`all:${kind}`, now);
  // A request only counts once it is allowed, so one blocked visitor cannot use up the shared ceiling.
  if (mine.length >= perVisitor || everyone.length >= (kind === "eval" ? 300 : 400)) {
    return Response.json({ error: "rate_limit", message: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  mine.push(now);
  everyone.push(now);
  // Bound memory by dropping the oldest entry, never the whole table.
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
  return null;
}
