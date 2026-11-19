"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gauge, outOfRange } from "@/lib/markers";
import type { Memory, Moment, Patient } from "@/lib/patient";
import { URGENCY, type Msg } from "@/lib/types";

type Props = {
  patient: Patient;
  moment: Moment;
  memory: Memory[];
  thread: Msg[];
  view: "chat" | "memory";
  onView: (v: "chat" | "memory") => void;
  draft: string;
  onDraft: (v: string) => void;
  onSend: (text: string) => void;
  onForget: (id: string) => void;
  disabled: boolean;
  live: boolean;
};

// The patient's side of the product: today's message, chat, and what the app remembers.
export function Phone({ patient, moment, memory, thread, view, onView, draft, onDraft, onSend, onForget, disabled, live }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const retested = moment.day >= patient.retestDay;

  // Keep a new proactive message readable from its first line; follow the chat once there is one.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: thread.length > 1 && view === "chat" ? el.scrollHeight : 0 });
  }, [thread, view]);

  return (
    <section className="phone" aria-label={`${patient.first}'s app`}>
      <div className="phone-head">
        <div>
          <strong>{patient.first}</strong>
          <span className="where">
            {moment.stage} · day {moment.day}/{patient.retestDay}
          </span>
        </div>
        <Tabs value={view} onValueChange={(v) => onView(v as "chat" | "memory")}>
          <TabsList className="h-8 rounded-full">
            <TabsTrigger value="chat" className="rounded-full px-3">
              Today
            </TabsTrigger>
            <TabsTrigger value="memory" className="rounded-full px-3">
              Memory {memory.length}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="markers">
        {patient.markers.slice(0, 6).map((m) => {
          const value = retested ? m.retest : m.baseline;
          const flagged = outOfRange(m, value);
          return (
            <div key={m.id} className={`marker ${flagged ? "flag" : ""}`}>
              <span title={m.name}>{m.short ?? m.name}</span>
              <b>
                {retested && <s>{m.baseline}</s>} {value}
              </b>
              <span className="gauge" aria-hidden>
                {gauge(m, value)}
              </span>
              <span className="sr-only">
                {flagged ? "outside the reference range of" : "reference range"} {m.range}
              </span>
            </div>
          );
        })}
      </div>

      <div className="screen" ref={scroller} aria-busy={disabled && live}>
        {view === "memory" ? (
          <div className="memory">
            <p className="muted small">Everything the app has learned about you. Remove anything and it stops shaping what you see.</p>
            {memory.length === 0 && <p className="muted">Nothing yet.</p>}
            {memory.map((m) => (
              <div key={m.id} className="mem">
                <div>
                  <p>{m.fact}</p>
                  <span className="muted small">{m.source}</span>
                </div>
                <Button variant="ghost" size="sm" className="rounded-full text-[var(--muted)] hover:text-[var(--coral)]" onClick={() => onForget(m.id)}>
                  Forget
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {thread.length === 0 && <p className="muted small pad">{live ? "Waiting for the previous reply to finish…" : moment.trigger}</p>}
            {thread.map((m, i) => (
              <div key={i} className={`row ${m.role}`}>
                <div className={`bubble ${m.insight ? "insight" : ""}`}>
                  {m.insight && <span className="kicker">For you today</span>}
                  {m.text ||
                    (m.error ? (
                      ""
                    ) : (
                      <span className="typing">
                        <Spinner className="size-3.5" /> Reading your chart
                      </span>
                    ))}
                  {m.error && <span className="err">{m.error}</span>}
                  {m.insight && m.text && (
                    <details className="why">
                      <summary>Why am I seeing this?</summary>
                      {moment.trigger}
                    </details>
                  )}
                </div>
                {(m.calls ?? []).map((c, j) => (
                  <div key={j} className={`receipt ${c.name === "handoff" ? c.urgency : ""}`}>
                    {c.name === "handoff" && (
                      <>
                        Sent to {patient.physician}&rsquo;s team · {URGENCY[c.urgency].toLowerCase()}
                      </>
                    )}
                    {c.name === "remember" && <>Saved to memory: {c.fact}</>}
                    {c.name === "forget" && <>Removed from memory</>}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Announce a reply once, when it is complete, instead of token by token. */}
      <p className="sr-only" role="status">
        {!disabled && thread.length > 0 && thread[thread.length - 1].role === "assistant" ? thread[thread.length - 1].text : ""}
      </p>

      {view === "chat" && (
        <div className="composer">
          <div className="chips">
            {moment.suggestions.map((s) => (
              <Button key={s} variant="outline" size="sm" className="h-auto min-h-8 rounded-full py-1.5 text-left font-normal whitespace-normal" disabled={disabled} onClick={() => onSend(s)}>
                {s}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend(draft);
            }}
          >
            <Input value={draft} onChange={(e) => onDraft(e.target.value)} placeholder={`Message as ${patient.first}`} maxLength={600} aria-label="Message" className="h-10 rounded-full px-4" />
            <Button type="submit" className="h-10 rounded-full border border-[var(--ink)]" disabled={disabled || !draft.trim()}>
              Send
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
