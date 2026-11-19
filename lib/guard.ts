import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Memory, Patient } from "./patient";
import type { Handoff } from "./prompt";

// The server keeps no session, so everything it hands the browser (a saved
// memory, a filed handoff, a finished reply) comes back on the next request.
// Each piece is signed on the way out and checked on the way in. Anything the
// browser invents or edits fails the check and never reaches the prompt.

function key(): Buffer {
  const secret = process.env.STATE_SECRET || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "local-dev";
  return createHash("sha256").update(`between-draws-state:${secret}`).digest();
}

export function sign(...parts: (string | number)[]): string {
  return createHmac("sha256", key()).update(JSON.stringify(parts)).digest("base64url");
}

function verify(sig: string | undefined, ...parts: (string | number)[]): boolean {
  if (!sig) return false;
  const expected = Buffer.from(sign(...parts));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const signMemory = (patientId: string, m: Pick<Memory, "id" | "day" | "fact">) => sign("memory", patientId, m.id, m.day, m.fact);
export const signHandoff = (patientId: string, h: Pick<Handoff, "day" | "urgency" | "question">) => sign("handoff", patientId, h.day, h.urgency, h.question);
export const signReply = (patientId: string, momentId: string, text: string) => sign("reply", patientId, momentId, text);

type ClientMemory = { id: string; day: number; fact: string; source: string; sig?: string };
type ClientHandoff = { day: number; urgency: Handoff["urgency"]; question: string; sig?: string };
type ClientTurn = { role: "user" | "assistant"; text: string; sig?: string };

// Seeded memories are matched by id and replaced with the server's own copy.
// Memories the model saved must carry a valid signature. Everything else is dropped.
export function trustedMemory(patient: Patient, day: number, sent: ClientMemory[]): Memory[] {
  const out: Memory[] = [];
  for (const m of sent) {
    const seeded = patient.seedMemory.find((s) => s.id === m.id);
    if (seeded) {
      if (seeded.day <= day) out.push(seeded);
    } else if (m.day <= day && verify(m.sig, "memory", patient.id, m.id, m.day, m.fact)) {
      out.push({ id: m.id, day: m.day, fact: m.fact, source: `chat, day ${m.day}` });
    }
  }
  return out;
}

export function trustedHandoffs(patient: Patient, day: number, sent: ClientHandoff[]): Handoff[] {
  return sent
    .filter((h) => h.day <= day && verify(h.sig, "handoff", patient.id, h.day, h.urgency, h.question))
    .map((h) => ({ day: h.day, urgency: h.urgency, question: h.question, summary: "" }));
}

// Patient turns are free text by nature. Assistant turns must be ones this server wrote.
export function trustedThread(patient: Patient, momentId: string, sent: ClientTurn[]): { role: "user" | "assistant"; text: string }[] {
  return sent
    .filter((t) => t.text.trim() && (t.role === "user" || verify(t.sig, "reply", patient.id, momentId, t.text)))
    .map((t) => ({ role: t.role, text: t.role === "user" ? cleanPatientText(t.text) : t.text }));
}

// Strip control characters and cap length. The content itself is still untrusted;
// the prompt tells the model so, and the reply is checked on the way out.
export function cleanPatientText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, 600);
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ");

// True if a reply repeats a long run of the system prompt word for word.
export function leaksPrompt(reply: string, systemRole: string): boolean {
  const said = normalize(reply);
  if (said.length < 120) return false;
  const source = normalize(systemRole);
  for (let i = 0; i + 120 <= source.length; i += 40) {
    if (said.includes(source.slice(i, i + 120))) return true;
  }
  return false;
}

export const LEAK_REPLACEMENT =
  "I can't share how I'm set up. I can help with your results, your protocol, or getting a question in front of your care team.";
