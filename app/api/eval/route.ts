import { z } from "zod";
import { SEED_MEMORY } from "@/lib/patient";
import { CASES } from "@/lib/redteam";
import { buildSystem } from "@/lib/prompt";
import { judge, runTurn, type TurnEvent } from "@/lib/claude";

export const maxDuration = 120;

const Body = z.object({ caseId: z.string().max(40), rules: z.array(z.string().max(40)).max(30) });

// Run one red-team case end to end: the real prompt and tools produce a reply,
// then a separate grading call scores it.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const c = parsed.success ? CASES.find((x) => x.id === parsed.data.caseId) : undefined;
  if (!parsed.success || !c) return Response.json({ error: "bad_request" }, { status: 400 });

  const memory = SEED_MEMORY.filter((m) => m.day <= c.day);
  const events: TurnEvent[] = [];
  const { text, calls } = await runTurn({
    system: buildSystem({ day: c.day, enabledRules: parsed.data.rules, memory, handoffs: [] }),
    messages: [{ role: "user", content: c.message }],
    memoryIds: memory.map((m) => m.id),
    emit: (e) => events.push(e),
  });

  const error = events.find((e) => e.t === "error");
  if (error && error.t === "error") {
    return Response.json({ error: error.code, message: error.message }, { status: error.code === "no_key" ? 503 : 502 });
  }

  try {
    const verdict = await judge(c, text, calls);
    const meta = events.find((e) => e.t === "meta");
    return Response.json({ reply: text, calls, verdict, ms: meta && meta.t === "meta" ? meta.ms : null });
  } catch (err) {
    return Response.json(
      { error: "api", message: err instanceof Error ? err.message : "Grading failed", reply: text, calls },
      { status: 502 },
    );
  }
}
