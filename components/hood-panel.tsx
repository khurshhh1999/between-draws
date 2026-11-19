"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBars, type StatusDay } from "@/components/block/status-bars";
import type { ToolCall } from "@/lib/claude";
import { RULES } from "@/lib/contract";
import { chartUpTo, type Memory, type Moment, type Patient } from "@/lib/patient";
import { URGENCY, type Meta } from "@/lib/types";

// Synthetic program start, so each program day lands on a real calendar date.
const PROGRAM_START = Date.UTC(2026, 4, 24);

const TONE = { routine: "bg-white text-[var(--ok)]", same_day: "bg-white text-[var(--amber)]", emergency: "bg-[var(--coral)] text-white" } as const;

// One bar per day of the program so far: not started, on protocol, or a gap.
function adherence(patient: Patient, day: number): StatusDay[] {
  return Array.from({ length: day + 1 }, (_, d): StatusDay => {
    const date = new Date(PROGRAM_START + d * 86_400_000).toISOString().slice(0, 10);
    if (d < patient.adherence.startDay) return { date, status: "none" };
    const gap = patient.adherence.gaps.find((g) => d >= g.from && d <= g.to);
    if (gap) return { date, status: gap.level, uptime: 0, incidents: [{ title: gap.note }] };
    return { date };
  });
}

type Props = {
  patient: Patient;
  moment: Moment;
  memory: Memory[];
  enabledCount: number;
  offTitles: string[];
  system: { role: string; chart: string; state: string };
  calls: ToolCall[];
  meta?: Meta;
  canRegenerate: boolean;
  onRegenerate: () => void;
};

// The product and engineering view of one moment: the bet, the inputs, the actions, the cost.
export function HoodPanel({ patient, moment, memory, enabledCount, offTitles, system, calls, meta, canRegenerate, onRegenerate }: Props) {
  const retested = moment.day >= patient.retestDay;
  return (
    <>
      <div className="bet">
        <span className="label">The bet · day {moment.day}</span>
        <p>{moment.bet}</p>
        <dl>
          <div>
            <dt>Moves</dt>
            <dd>{moment.metric}</dd>
          </div>
          <div>
            <dt>Must hold</dt>
            <dd>{moment.guardrail}</dd>
          </div>
        </dl>
      </div>

      <h2>What the model was given</h2>
      <ul className="facts">
        <li>
          <b>Trigger</b> {moment.trigger}
        </li>
        <li>
          <b>Chart</b> {chartUpTo(patient, moment.day).length} log entries through day {moment.day},{" "}
          {retested ? "baseline and retest labs" : "baseline labs only (the retest does not exist yet)"}
        </li>
        <li>
          <b>Memory</b> {memory.length ? memory.map((m) => m.fact).join(" · ") : "empty"}
        </li>
        <li>
          <b>Contract</b>
          <span>
            {enabledCount} of {RULES.length} rules
            {offTitles.length > 0 && <span className="warn"> (off: {offTitles.join(", ")})</span>}
          </span>
        </li>
        <li>
          <b>Adherence</b>
          <StatusBars label="Protocol adherence" days={adherence(patient, moment.day)} maxDays={patient.retestDay + 1} minBarWidth={1} compact className="min-w-0" />
        </li>
      </ul>
      <details className="prompt">
        <summary>Exact system prompt for this turn</summary>
        <pre>{[system.role, system.chart, system.state].join("\n\n———\n\n")}</pre>
      </details>

      <h2>What it did besides talk</h2>
      {calls.length === 0 && <p className="muted">No tool calls in this moment yet. Try a suggested message.</p>}
      {calls.map((c, i) => (
        <div key={i} className={`call ${c.name === "handoff" ? c.urgency : ""}`}>
          {c.name === "handoff" && (
            <>
              <Badge variant="outline" className={`mb-3 border-0 font-mono font-normal uppercase tracking-wider ${TONE[c.urgency]}`}>
                Handoff · {URGENCY[c.urgency]}
              </Badge>
              <p className="q">{c.question}</p>
              <p>{c.summary}</p>
            </>
          )}
          {c.name === "remember" && (
            <>
              <span className="label">Memory write</span>
              <p>{c.fact}</p>
            </>
          )}
          {c.name === "forget" && (
            <>
              <span className="label">Memory delete</span>
              <p>{c.id}</p>
            </>
          )}
        </div>
      ))}

      <h2>What the last turn cost</h2>
      {meta ? (
        <div className="stats">
          <div>
            <b>{meta.firstTokenMs !== null ? (meta.firstTokenMs / 1000).toFixed(1) : "–"}s</b>
            <span>to first word</span>
          </div>
          <div>
            <b>{(meta.ms / 1000).toFixed(1)}s</b>
            <span>total</span>
          </div>
          <div>
            <b>{(meta.usage.input + meta.usage.cacheRead + meta.usage.cacheWrite).toLocaleString()}</b>
            <span>tokens in{meta.usage.cacheRead ? `, ${meta.usage.cacheRead.toLocaleString()} cached` : ""}</span>
          </div>
          <div>
            <b>{meta.usage.output.toLocaleString()}</b>
            <span>tokens out</span>
          </div>
          <div>
            <b>{meta.rounds}</b>
            <span>model {meta.rounds === 1 ? "call" : "calls"}</span>
          </div>
        </div>
      ) : (
        <p className="muted">No turn yet.</p>
      )}
      <Button variant="outline" size="sm" className="mt-5 rounded-full" disabled={!canRegenerate} onClick={onRegenerate}>
        Regenerate this moment
      </Button>
    </>
  );
}
