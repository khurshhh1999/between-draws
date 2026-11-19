"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RULES, ALL_RULE_IDS } from "@/lib/contract";
import { MARKERS, MOMENTS, PATIENT, SEED_MEMORY, chartUpTo, type Marker, type Memory, type Moment } from "@/lib/patient";
import { buildSystem, type Handoff } from "@/lib/prompt";
import { CASES } from "@/lib/redteam";
import type { ToolCall, TurnEvent, Verdict } from "@/lib/claude";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBars, type StatusDay } from "@/components/block/status-bars";

type Msg = { role: "user" | "assistant"; text: string; insight?: boolean; calls?: ToolCall[]; error?: string };
type Meta = Extract<TurnEvent, { t: "meta" }>;
type EvalResult = { status: "running" | "done" | "error"; reply?: string; calls?: ToolCall[]; verdict?: Verdict; message?: string };
type Run = { off: string[]; pass: number; total: number };

const URGENCY = { routine: "Routine", same_day: "Same day", emergency: "Emergency" } as const;

async function streamTurn(url: string, body: unknown, onEvent: (e: TurnEvent) => void) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok || !res.body) {
    onEvent({ t: "error", code: "api", message: `Request failed (${res.status}).` });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as TurnEvent);
  }
}

// Synthetic program start, so day 90 lands on a real calendar date.
const PROGRAM_START = Date.UTC(2026, 7, 21);

// One bar per day of the program so far: not started, on protocol, or a missed dose.
function adherence(day: number): StatusDay[] {
  return Array.from({ length: day + 1 }, (_, d) => {
    const date = new Date(PROGRAM_START + d * 86_400_000).toISOString().slice(0, 10);
    if (d < 3) return { date, status: "none" as const };
    if (d === 25) return { date, status: "down" as const, uptime: 0, incidents: [{ title: "Thursday dose not logged" }] };
    return { date };
  });
}

const TONE = { routine: "border-[var(--mint-line)] text-[var(--mint)]", same_day: "border-[var(--amber-line)] text-[var(--amber)]", emergency: "border-[var(--red-line)] text-[var(--red)]" } as const;

function outOfRange(m: Marker, value: number): boolean {
  const nums = m.range.match(/[\d.]+/g)?.map(Number) ?? [];
  if (m.range.startsWith("under")) return value >= nums[0];
  return nums.length === 2 ? value < nums[0] || value > nums[1] : false;
}

export default function Page() {
  const [live, setLive] = useState<boolean | null>(null);
  const [model, setModel] = useState("");
  const [idx, setIdx] = useState(0);
  const [rulesOn, setRulesOn] = useState<Record<string, boolean>>(() => Object.fromEntries(ALL_RULE_IDS.map((id) => [id, true])));
  const [learned, setLearned] = useState<Memory[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"hood" | "contract" | "redteam">("hood");
  const [view, setView] = useState<"chat" | "memory">("chat");
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<Record<string, EvalResult>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [evalBusy, setEvalBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const started = useRef(new Set<string>());
  const scroller = useRef<HTMLDivElement>(null);

  const moment = MOMENTS[idx];
  const enabledRules = useMemo(() => ALL_RULE_IDS.filter((id) => rulesOn[id]), [rulesOn]);
  const offRules = ALL_RULE_IDS.filter((id) => !rulesOn[id]);
  const memory = useMemo(
    () => [...SEED_MEMORY, ...learned].filter((m) => m.day <= moment.day && !deleted.includes(m.id)),
    [learned, deleted, moment.day],
  );
  const openHandoffs = useMemo(() => handoffs.filter((h) => h.day <= moment.day), [handoffs, moment.day]);
  const thread = threads[moment.id] ?? [];
  const meta = metas[moment.id];

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { live: boolean; model: string }) => {
        setLive(s.live);
        setModel(s.model);
      })
      .catch(() => setLive(false));
  }, []);

  const run = useCallback(
    async (m: Moment, url: string, body: Record<string, unknown>) => {
      setBusy(true);
      const patch = (fn: (last: Msg) => Msg) =>
        setThreads((t) => {
          const list = t[m.id] ?? [];
          return { ...t, [m.id]: [...list.slice(0, -1), fn(list[list.length - 1])] };
        });
      try {
        await streamTurn(url, body, (e) => {
          if (e.t === "text") patch((last) => ({ ...last, text: last.text + e.d }));
          else if (e.t === "reset") patch((last) => ({ ...last, text: "" }));
          else if (e.t === "error") patch((last) => ({ ...last, error: e.message }));
          else if (e.t === "meta") setMetas((x) => ({ ...x, [m.id]: e }));
          else if (e.t === "tool") {
            const call = e.call;
            patch((last) => ({ ...last, calls: [...(last.calls ?? []), call] }));
            if (call.name === "remember") setLearned((l) => [...l, { id: call.id, day: m.day, fact: call.fact, source: `chat, day ${m.day}` }]);
            if (call.name === "forget") setDeleted((d) => [...d, call.id]);
            if (call.name === "handoff") setHandoffs((h) => [...h, { day: m.day, urgency: call.urgency, question: call.question, summary: call.summary }]);
          }
        });
      } catch {
        patch((last) => ({ ...last, error: "Connection lost." }));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const generate = useCallback(
    (m: Moment) => {
      setThreads((t) => ({ ...t, [m.id]: [{ role: "assistant", text: "", insight: true }] }));
      void run(m, "/api/moment", { momentId: m.id, rules: enabledRules, memory, handoffs: openHandoffs });
    },
    [run, enabledRules, memory, openHandoffs],
  );

  // Each moment's proactive message is generated the first time you land on it.
  useEffect(() => {
    if (!live || busy || started.current.has(moment.id)) return;
    started.current.add(moment.id);
    generate(moment);
  }, [live, busy, moment, generate]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [thread, view]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy || !live) return;
    const history = [...thread, { role: "user" as const, text: clean }];
    setThreads((t) => ({ ...t, [moment.id]: [...history, { role: "assistant", text: "" }] }));
    setDraft("");
    setView("chat");
    void run(moment, "/api/chat", {
      momentId: moment.id,
      rules: enabledRules,
      memory,
      handoffs: openHandoffs,
      thread: history.filter((m) => m.text.trim()).map((m) => ({ role: m.role, text: m.text })),
    });
  }

  async function runEvals() {
    if (evalBusy || !live) return;
    setEvalBusy(true);
    setResults(Object.fromEntries(CASES.map((c) => [c.id, { status: "running" as const }])));
    const queue = [...CASES];
    const final: Record<string, EvalResult> = {};
    const worker = async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        const id = c.id;
        try {
          const res = await fetch("/api/eval", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ caseId: id, rules: enabledRules }) });
          const data = await res.json();
          final[id] = res.ok ? { status: "done", ...data } : { status: "error", message: data.message ?? "Failed", reply: data.reply, calls: data.calls };
        } catch {
          final[id] = { status: "error", message: "Request failed" };
        }
        setResults((r) => ({ ...r, [id]: final[id] }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const graded = Object.values(final).filter((r) => r.status === "done");
    setRuns((r) => [{ off: offRules, pass: graded.filter((x) => x.verdict?.pass).length, total: graded.length }, ...r].slice(0, 6));
    setEvalBusy(false);
  }

  const system = buildSystem({ day: moment.day, enabledRules, memory, handoffs: openHandoffs });
  const calls = thread.flatMap((m) => m.calls ?? []);
  const passCount = Object.values(results).filter((r) => r.verdict?.pass).length;
  const doneCount = Object.values(results).filter((r) => r.status !== "running").length;
  const ruleTitle = (id: string) => RULES.find((r) => r.id === id)?.title ?? id;

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Between Draws</h1>
          <p className="lede">
            Hone sees a patient&rsquo;s blood every 90 days. This is a working prototype of what the AI does on the other 89, and of the
            contract that keeps it safe to ship.
          </p>
        </div>
        <Badge variant="outline" className="gap-2 rounded-md px-2.5 py-1.5 font-mono font-normal text-[var(--soft)]">
          <span className={`size-1.5 rounded-full ${live ? "bg-[var(--mint)]" : live === false ? "bg-[var(--red)]" : "bg-[var(--muted)]"}`} />
          {live === null ? "Checking" : live ? `Live · ${model}` : "No model connected"}
        </Badge>
      </header>

      {live === false && (
        <Alert className="mt-5">
          <AlertTitle>No model connected</AlertTitle>
          <AlertDescription>
            <p>
              Nothing here is pre-recorded, so it needs a key. Add <code>ANTHROPIC_API_KEY</code> to <code>.env.local</code> and restart the
              server.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <nav className="timeline" aria-label="Patient journey">
        {MOMENTS.map((m, i) => (
          <button key={m.id} className={`stop ${i === idx ? "active" : ""} ${threads[m.id] ? "seen" : ""}`} onClick={() => setIdx(i)}>
            <span className="stage">{i === 0 || MOMENTS[i - 1].stage !== m.stage ? m.stage : " "}</span>
            <span className="pin" />
            <span className="day">Day {m.day}</span>
            <span className="name">{m.title}</span>
          </button>
        ))}
      </nav>

      <div className="grid">
        <section className="phone" aria-label="Patient app">
          <div className="phone-head">
            <div>
              <strong>{PATIENT.first}</strong>
              <span className="muted"> · day {moment.day}</span>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as "chat" | "memory")}>
              <TabsList className="h-8">
                <TabsTrigger value="chat">Today</TabsTrigger>
                <TabsTrigger value="memory">Memory {memory.length}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="markers">
            {MARKERS.slice(0, 6).map((m) => {
              const retested = moment.day >= 90;
              const value = retested ? m.retest : m.baseline;
              return (
                <div key={m.id} className={`marker ${outOfRange(m, value) ? "flag" : ""}`}>
                  <span>{m.name}</span>
                  <b>
                    {retested && <s>{m.baseline}</s>} {value}
                  </b>
                </div>
              );
            })}
          </div>

          <div className="screen" ref={scroller}>
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
                    <Button variant="ghost" size="sm" className="text-[var(--muted)] hover:text-[var(--red)]" onClick={() => setDeleted((d) => [...d, m.id])}>
                      Forget
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {thread.length === 0 && <p className="muted small pad">{live ? "Waiting for the trigger…" : moment.trigger}</p>}
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
                        {c.name === "handoff" && <>Sent to {PATIENT.physician}&rsquo;s team · {URGENCY[c.urgency].toLowerCase()}</>}
                        {c.name === "remember" && <>Saved to memory: {c.fact}</>}
                        {c.name === "forget" && <>Removed from memory</>}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          {view === "chat" && (
            <div className="composer">
              <div className="chips">
                {moment.suggestions.map((s) => (
                  <Button key={s} variant="outline" size="sm" className="font-normal" disabled={busy || !live} onClick={() => send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
              >
                <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Message as ${PATIENT.first}`} maxLength={600} aria-label="Message" />
                <Button type="submit" disabled={busy || !live || !draft.trim()}>
                  Send
                </Button>
              </form>
            </div>
          )}
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="panel gap-0">
          <div className="panel-head">
            <TabsList>
              <TabsTrigger value="hood">Under the hood</TabsTrigger>
              <TabsTrigger value="contract">Behavior contract{offRules.length ? ` · ${offRules.length} off` : ""}</TabsTrigger>
              <TabsTrigger value="redteam">Red team{doneCount ? ` · ${passCount}/${CASES.length}` : ""}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="hood" className="body">
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

              <h3>What the model was given</h3>
              <ul className="facts">
                <li>
                  <b>Trigger</b> {moment.trigger}
                </li>
                <li>
                  <b>Chart</b> {chartUpTo(moment.day).length} log entries through day {moment.day},{" "}
                  {moment.day >= 90 ? "baseline and retest labs" : "baseline labs only (the retest does not exist yet)"}
                </li>
                <li>
                  <b>Memory</b> {memory.length ? memory.map((m) => m.fact).join(" · ") : "empty"}
                </li>
                <li>
                  <b>Contract</b> {enabledRules.length} of {RULES.length} rules
                  {offRules.length > 0 && <span className="warn"> (off: {offRules.map(ruleTitle).join(", ")})</span>}
                </li>
                <li>
                  <b>Doses</b>
                  <StatusBars label="Protocol adherence" days={adherence(moment.day)} maxDays={91} compact className="min-w-0" />
                </li>
              </ul>
              <details className="prompt">
                <summary>Exact system prompt for this turn</summary>
                <pre>{[system.role, system.chart, system.state].join("\n\n———\n\n")}</pre>
              </details>

              <h3>What it did besides talk</h3>
              {calls.length === 0 && <p className="muted">No tool calls in this moment yet. Try a suggested message.</p>}
              {calls.map((c, i) => (
                <div key={i} className={`call ${c.name === "handoff" ? c.urgency : ""}`}>
                  {c.name === "handoff" && (
                    <>
                      <Badge variant="outline" className={`mb-2 rounded-md font-mono font-normal uppercase tracking-wider ${TONE[c.urgency]}`}>
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

              <h3>What the last turn cost</h3>
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
              <Button variant="outline" size="sm" className="mt-5" disabled={busy || !live} onClick={() => generate(moment)}>
                Regenerate this moment
              </Button>
          </TabsContent>

          <TabsContent value="contract" className="body">
              <p className="intro">
                Ten rules, written so a physician, a PM, and an engineer can argue over the same page. They are compiled word for word into
                the system prompt. Switch one off, then replay a moment or run the red team to see whether that rule was doing any work.
              </p>
              {RULES.map((r) => (
                <div key={r.id} className={`rule ${rulesOn[r.id] ? "" : "off"}`}>
                  <Switch id={`rule-${r.id}`} className="mt-1" checked={rulesOn[r.id]} onCheckedChange={(on) => setRulesOn((x) => ({ ...x, [r.id]: on }))} />
                  <div>
                    <div className="rule-head">
                      <label htmlFor={`rule-${r.id}`}>
                        <strong>{r.title}</strong>
                      </label>
                      <Badge variant="outline" className="rounded-md font-mono font-normal uppercase tracking-wider text-[var(--muted)]">
                        {r.owner}
                      </Badge>
                    </div>
                    <p>{r.text}</p>
                  </div>
                </div>
              ))}
          </TabsContent>

          <TabsContent value="redteam" className="body">
              <p className="intro">
                {CASES.length} patient messages that a health AI gets wrong in costly ways. Each one runs through the real prompt and tools,
                then a separate grading call scores the reply against written criteria. Nothing is cached, so results can vary run to run.
              </p>
              <div className="runbar">
                <Button disabled={evalBusy || !live} onClick={runEvals}>
                  {evalBusy && <Spinner />}
                  {evalBusy ? `Running ${doneCount}/${CASES.length}…` : offRules.length ? `Run with ${offRules.length} rule${offRules.length > 1 ? "s" : ""} off` : "Run all cases"}
                </Button>
                <div className="history">
                  {runs.map((r, i) => (
                    <span key={i} className={r.pass === r.total ? "ok" : "bad"}>
                      {r.pass}/{r.total} {r.off.length ? `without ${r.off.map(ruleTitle).join(", ")}` : "full contract"}
                    </span>
                  ))}
                </div>
              </div>
              {CASES.map((c) => {
                const r = results[c.id];
                const state = !r ? "idle" : r.status === "running" ? "running" : r.status === "error" ? "error" : r.verdict?.pass ? "pass" : "fail";
                return (
                  <div key={c.id} className={`case ${state}`}>
                    <button className="case-head" onClick={() => setOpen(open === c.id ? null : c.id)}>
                      <span className="mark">
                        {state === "running" ? <Spinner className="size-3.5" /> : { idle: "", error: "Error", pass: "Pass", fail: "Fail" }[state]}
                      </span>
                      <span className="case-main">
                        <strong>{c.label}</strong>
                        <span className="muted">
                          {ruleTitle(c.rule)}
                          {!rulesOn[c.rule] && " (rule off)"}
                        </span>
                      </span>
                    </button>
                    {open === c.id && (
                      <div className="case-body">
                        <p className="said">&ldquo;{c.message}&rdquo;</p>
                        <p className="small">
                          <b>Must</b> {c.mustDo}
                        </p>
                        <p className="small">
                          <b>Must not</b> {c.mustNot}
                        </p>
                        {r?.reply && <p className="reply">{r.reply}</p>}
                        {(r?.calls ?? []).map((k, i) => (
                          <p key={i} className="small mono">
                            {k.name === "handoff" ? `handoff(${k.urgency}): ${k.question}` : k.name === "remember" ? `remember: ${k.fact}` : `forget: ${k.id}`}
                          </p>
                        ))}
                        {r?.verdict && (
                          <p className="small">
                            <b>Grader</b> {r.verdict.reason}
                          </p>
                        )}
                        {r?.message && <p className="err">{r.message}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
          </TabsContent>
        </Tabs>
      </div>

      <footer>
        Concept prototype by Khursheed Khan for the Product Manager, AI Experience role. Not affiliated with or endorsed by Hone Health. The
        patient, physician, and every number here are synthetic.
      </footer>
    </main>
  );
}
