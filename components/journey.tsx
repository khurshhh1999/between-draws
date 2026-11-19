"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HoodPanel } from "@/components/hood-panel";
import { Phone } from "@/components/phone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RULES } from "@/lib/contract";
import type { Memory, Moment, Patient } from "@/lib/patient";
import { buildSystem, type Handoff } from "@/lib/prompt";
import { streamTurn } from "@/lib/stream";
import type { Meta, Msg, PanelTab } from "@/lib/types";

// The summary is for the clinician and stays in the browser; the server only needs these fields.
const wire = ({ day, urgency, question, sig }: Handoff) => ({ day, urgency, question, sig });

type Props = {
  patient: Patient;
  active: boolean;
  live: boolean;
  enabledRules: string[];
  offRules: string[];
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  contractLabel: string;
  redteamLabel: string;
  contract: ReactNode;
  redteam: ReactNode;
  pm: ReactNode;
};

// One patient's journey: the timeline, their phone, and the panel that explains each moment.
// Each patient keeps their own conversation, memory and handoffs.
export function Journey({ patient, active, live, enabledRules, offRules, tab, onTab, contractLabel, redteamLabel, contract, redteam, pm }: Props) {
  const [idx, setIdx] = useState(0);
  const [learned, setLearned] = useState<Memory[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [metas, setMetas] = useState<Record<string, Meta>>({});
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"chat" | "memory">("chat");
  const [draft, setDraft] = useState("");
  const started = useRef(new Set<string>());
  const inFlight = useRef<AbortController | null>(null);
  const timeline = useRef<HTMLElement>(null);

  const moment = patient.moments[idx];
  const memory = useMemo(
    () => [...patient.seedMemory, ...learned].filter((m) => m.day <= moment.day && !deleted.includes(m.id)),
    [patient, learned, deleted, moment.day],
  );
  const openHandoffs = useMemo(() => handoffs.filter((h) => h.day <= moment.day), [handoffs, moment.day]);
  const thread = threads[moment.id] ?? [];

  const run = useCallback(
    async (m: Moment, url: string, body: Record<string, unknown>) => {
      setBusy(true);
      const patch = (fn: (last: Msg) => Msg) =>
        setThreads((t) => {
          const list = t[m.id] ?? [];
          return { ...t, [m.id]: [...list.slice(0, -1), fn(list[list.length - 1])] };
        });
      const controller = new AbortController();
      inFlight.current = controller;
      try {
        await streamTurn(
          url,
          { patientId: patient.id, momentId: m.id, ...body },
          (e) => {
            if (e.t === "text") patch((last) => ({ ...last, text: last.text + e.d }));
            else if (e.t === "reset") patch((last) => ({ ...last, text: "" }));
            else if (e.t === "error") patch((last) => ({ ...last, error: e.message }));
            else if (e.t === "meta") {
              setMetas((x) => ({ ...x, [m.id]: e }));
              patch((last) => ({ ...last, sig: e.sig }));
            }
            else if (e.t === "tool") {
              const call = e.call;
              patch((last) => ({ ...last, calls: [...(last.calls ?? []), call] }));
              if (call.name === "remember") setLearned((l) => [...l, { id: call.id, day: m.day, fact: call.fact, source: `chat, day ${m.day}`, sig: call.sig }]);
              if (call.name === "forget") setDeleted((d) => [...d, call.id]);
              if (call.name === "handoff") setHandoffs((h) => [...h, { day: m.day, urgency: call.urgency, question: call.question, summary: call.summary, sig: call.sig }]);
            }
          },
          controller.signal,
        );
      } catch {
        // An aborted first load (unmount, strict-mode remount) is allowed to start again.
        if (controller.signal.aborted) started.current.delete(m.id);
        else patch((last) => ({ ...last, error: "Connection lost." }));
      } finally {
        setBusy(false);
      }
    },
    [patient.id],
  );

  const generate = useCallback(
    (m: Moment) => {
      // Regenerating a moment discards what its previous run saved or escalated (deletions stay deleted).
      const fromThisRun = (x: Memory) => x.day === m.day && learned.some((l) => l.id === x.id);
      setLearned((l) => l.filter((x) => x.day !== m.day));
      setHandoffs((h) => h.filter((x) => x.day !== m.day));
      setThreads((t) => ({ ...t, [m.id]: [{ role: "assistant", text: "", insight: true }] }));
      void run(m, "/api/moment", {
        rules: enabledRules,
        memory: memory.filter((x) => !fromThisRun(x)),
        handoffs: openHandoffs
          .filter((h) => h.day !== m.day)
          .slice(-20)
          .map(wire),
      });
    },
    [run, enabledRules, memory, openHandoffs, learned],
  );

  useEffect(() => () => inFlight.current?.abort(), []);

  // Each moment's proactive message is generated the first time you land on it.
  useEffect(() => {
    if (!active || !live || busy || started.current.has(moment.id)) return;
    started.current.add(moment.id);
    generate(moment);
  }, [active, live, busy, moment, generate]);

  // On narrow screens the timeline scrolls sideways; keep the selected stop in view.
  useEffect(() => {
    const nav = timeline.current;
    const stop = nav?.children[idx] as HTMLElement | undefined;
    if (!nav || !stop || nav.scrollWidth <= nav.clientWidth) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    nav.scrollTo({ left: stop.offsetLeft - (nav.clientWidth - stop.clientWidth) / 2, behavior: calm ? "auto" : "smooth" });
  }, [idx, active]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean || busy || !live) return;
    const history = [...thread, { role: "user" as const, text: clean }];
    setThreads((t) => ({ ...t, [moment.id]: [...history, { role: "assistant", text: "" }] }));
    setDraft("");
    setView("chat");
    void run(moment, "/api/chat", {
      rules: enabledRules,
      memory,
      handoffs: openHandoffs.slice(-20).map(wire),
      // The server accepts a bounded history; a long chat sends its most recent turns.
      thread: history
        .filter((m) => m.text.trim())
        .slice(-20)
        .map((m) => ({ role: m.role, text: m.text, sig: m.sig })),
    });
  }

  const system = buildSystem({ patient, day: moment.day, enabledRules, memory, handoffs: openHandoffs });
  const offTitles = offRules.map((id) => RULES.find((r) => r.id === id)?.title ?? id);

  return (
    <div hidden={!active}>
      <nav
        className="timeline"
        aria-label={`${patient.first}'s journey`}
        ref={timeline}
        onScroll={(e) => {
          const el = e.currentTarget;
          el.dataset.end = String(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
        }}
      >
        {patient.moments.map((m, i) => (
          <button
            key={m.id}
            aria-current={i === idx ? "step" : undefined}
            className={`stop ${i === idx ? "active" : ""} ${threads[m.id] ? "seen" : ""}`}
            onClick={() => {
              setIdx(i);
              setView("chat");
            }}
          >
            <span className="stage">{i === 0 || patient.moments[i - 1].stage !== m.stage ? m.stage : " "}</span>
            <span className="pin" />
            <span className="day">Day {m.day}</span>
            <span className="name">{m.title}</span>
          </button>
        ))}
      </nav>

      <div className="layout">
        <Phone
          patient={patient}
          moment={moment}
          memory={memory}
          thread={thread}
          view={view}
          onView={setView}
          draft={draft}
          onDraft={setDraft}
          onSend={send}
          onForget={(id) => setDeleted((d) => [...d, id])}
          disabled={busy || !live}
          live={live}
        />

        <Tabs value={tab} onValueChange={(v) => onTab(v as PanelTab)} className="panel gap-0">
          <div className="panel-head">
            <TabsList className="h-10 w-full rounded-full sm:w-fit">
              <TabsTrigger value="hood" className="rounded-full px-4">
                Under the hood
              </TabsTrigger>
              <TabsTrigger value="contract" className="rounded-full px-4">
                {contractLabel}
              </TabsTrigger>
              <TabsTrigger value="redteam" className="rounded-full px-4">
                {redteamLabel}
              </TabsTrigger>
              <TabsTrigger value="pm" className="rounded-full px-4">
                PM view
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="hood" className="body">
            <HoodPanel
              patient={patient}
              moment={moment}
              memory={memory}
              enabledCount={enabledRules.length}
              offTitles={offTitles}
              system={system}
              calls={thread.flatMap((m) => m.calls ?? [])}
              meta={metas[moment.id]}
              canRegenerate={live && !busy}
              onRegenerate={() => generate(moment)}
            />
          </TabsContent>
          <TabsContent value="contract" className="body">
            {contract}
          </TabsContent>
          <TabsContent value="redteam" className="body">
            {redteam}
          </TabsContent>
          <TabsContent value="pm" className="body">
            {pm}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
