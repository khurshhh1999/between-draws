"use client";

import { useEffect, useMemo, useState } from "react";
import { ContractPanel } from "@/components/contract-panel";
import { Journey } from "@/components/journey";
import { PmPanel } from "@/components/pm-panel";
import { RedTeamPanel } from "@/components/redteam-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ALL_RULE_IDS } from "@/lib/contract";
import { PATIENTS, type Patient } from "@/lib/patient";
import { CASES } from "@/lib/redteam";
import type { EvalResult, PanelTab, Run } from "@/lib/types";

export default function Page() {
  const [live, setLive] = useState<boolean | null>(null);
  const [patientId, setPatientId] = useState<Patient["id"]>("marcus");
  const [tab, setTab] = useState<PanelTab>("hood");
  const [rulesOn, setRulesOn] = useState<Record<string, boolean>>(() => Object.fromEntries(ALL_RULE_IDS.map((id) => [id, true])));
  const [results, setResults] = useState<Record<string, EvalResult>>({});
  const [runs, setRuns] = useState<Run[]>([]);
  const [evalBusy, setEvalBusy] = useState(false);

  const enabledRules = useMemo(() => ALL_RULE_IDS.filter((id) => rulesOn[id]), [rulesOn]);
  const offRules = useMemo(() => ALL_RULE_IDS.filter((id) => !rulesOn[id]), [rulesOn]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { live: boolean }) => setLive(s.live))
      .catch(() => setLive(false));
  }, []);

  // Three cases at a time, each a full reply plus a grading call.
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
          const res = await fetch("/api/eval", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ caseId: id, rules: enabledRules }),
          });
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

  const passed = Object.values(results).filter((r) => r.verdict?.pass).length;
  const graded = Object.values(results).filter((r) => r.status !== "running").length;

  return (
    <main className="wrap">
      <header>
        <p className="eyebrow">Concept · AI Experience</p>
        <h1>
          The days <mark>between draws</mark>
        </h1>
        <p className="lede">
          Baseline, Blueprint, Build, Become. Labs come round every three to six months. This is a working prototype of what the AI does for
          a patient on every day in between, and of the contract that keeps it safe to ship.
        </p>
        <p className="start">
          <b>Start here.</b> Marcus and Dana are made up; the AI replies are live. You play the patient. Open <i>The day-12 dip</i> and tap
          &ldquo;Should I just take a bit more this week?&rdquo; to watch it hold the line and alert his doctor.
        </p>
        <div className="switch" role="group" aria-label="Choose a patient">
          {PATIENTS.map((p) => (
            <button key={p.id} aria-pressed={p.id === patientId} onClick={() => setPatientId(p.id)}>
              <span>
                {p.first}, {p.age}
              </span>
              <small>{p.switchLabel}</small>
            </button>
          ))}
        </div>
      </header>

      <aside className="learned" aria-label="What building this taught me">
        <span className="label">What building this taught me</span>
        <ol>
          <li>
            <b>The worst emergency reply came from a tool, not the prompt.</b> The handoff tool asked what the AI had &ldquo;told&rdquo; the
            patient before it had said anything, so it opened with a garbled sentence instead of &ldquo;call 911.&rdquo; Rewording the tool
            fixed it.
          </li>
          <li>
            <b>Missed doses are a product gap.</b> Asked about doubling up, the AI either improvises or escalates every miss. It should quote
            the clinic&rsquo;s approved missed-dose wording.
          </li>
          <li>
            <b>One safety rule may do nothing.</b> Switching off &ldquo;Physicians own the protocol&rdquo; changed no test result. Either
            other rules cover it or my tests are too easy.
          </li>
        </ol>
      </aside>

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

      {PATIENTS.map((p) => (
        <Journey
          key={p.id}
          patient={p}
          active={p.id === patientId}
          live={live === true}
          enabledRules={enabledRules}
          offRules={offRules}
          tab={tab}
          onTab={setTab}
          contractLabel={`Contract${offRules.length ? ` · ${offRules.length} off` : ""}`}
          redteamLabel={`Red team${graded ? ` · ${passed}/${CASES.length}` : ""}`}
          contract={<ContractPanel rulesOn={rulesOn} onToggle={(id, on) => setRulesOn((x) => ({ ...x, [id]: on }))} />}
          redteam={
            <RedTeamPanel results={results} runs={runs} running={evalBusy} live={live === true} rulesOn={rulesOn} offCount={offRules.length} onRun={runEvals} />
          }
          pm={<PmPanel />}
        />
      ))}

      <footer>
        Concept prototype by Khursheed Khan for the Product Manager, AI Experience role. Not affiliated with or endorsed by Hone Health. The
        patients, physicians, and every number here are synthetic.
      </footer>
    </main>
  );
}
