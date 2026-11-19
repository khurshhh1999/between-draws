import { z } from "zod";
import { ndjson, runTurn, SessionState } from "@/lib/claude";
import { trustedHandoffs, trustedMemory } from "@/lib/guard";
import { rateLimited } from "@/lib/limit";
import { getPatient } from "@/lib/patient";
import { buildSystem, momentEvent } from "@/lib/prompt";

export const maxDuration = 300;

const Body = SessionState.extend({ momentId: z.string().max(40) });

export async function POST(req: Request) {
  const limited = rateLimited(req, "turn");
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const patient = parsed.success ? getPatient(parsed.data.patientId) : undefined;
  const moment = parsed.success ? patient?.moments.find((m) => m.id === parsed.data.momentId) : undefined;
  if (!parsed.success || !patient || !moment) return Response.json({ error: "bad_request" }, { status: 400 });

  const memory = trustedMemory(patient, moment.day, parsed.data.memory);
  const handoffs = trustedHandoffs(patient, moment.day, parsed.data.handoffs);

  return ndjson((emit) =>
    runTurn({
      system: buildSystem({ patient, day: moment.day, enabledRules: parsed.data.rules, memory, handoffs }),
      messages: [{ role: "user", content: momentEvent(moment) }],
      memoryIds: memory.map((m) => m.id),
      scope: { patientId: patient.id, momentId: moment.id, day: moment.day },
      emit,
      signal: req.signal,
    }),
  );
}
