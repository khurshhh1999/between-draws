import { z } from "zod";
import { MOMENTS } from "@/lib/patient";
import { buildSystem, momentEvent } from "@/lib/prompt";
import { ndjson, runTurn, SessionState } from "@/lib/claude";

export const maxDuration = 60;

const Body = SessionState.extend({ momentId: z.string().max(40) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const moment = parsed.success ? MOMENTS.find((m) => m.id === parsed.data.momentId) : undefined;
  if (!parsed.success || !moment) return Response.json({ error: "bad_request" }, { status: 400 });
  const { rules, memory, handoffs } = parsed.data;

  return ndjson((emit) =>
    runTurn({
      system: buildSystem({ day: moment.day, enabledRules: rules, memory, handoffs }),
      messages: [{ role: "user", content: momentEvent(moment) }],
      memoryIds: memory.map((m) => m.id),
      emit,
    }),
  );
}
