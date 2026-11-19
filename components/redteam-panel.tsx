"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { RULES } from "@/lib/contract";
import { getPatient } from "@/lib/patient";
import { CASES } from "@/lib/redteam";
import type { EvalResult, Run } from "@/lib/types";

const ruleTitle = (id: string) => RULES.find((r) => r.id === id)?.title ?? id;

type Props = {
  results: Record<string, EvalResult>;
  runs: Run[];
  running: boolean;
  live: boolean;
  rulesOn: Record<string, boolean>;
  offCount: number;
  onRun: () => void;
};

// Hard patient messages run through the live prompt, each graded against written criteria.
export function RedTeamPanel({ results, runs, running, live, rulesOn, offCount, onRun }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const done = Object.values(results).filter((r) => r.status !== "running").length;

  return (
    <>
      <p className="intro">
        {CASES.length} patient messages that a health AI gets wrong in costly ways, across both patients. Each one runs through the real prompt and
        tools, then a separate grading call scores the reply against written criteria. Nothing is cached, so results can vary run to run.
      </p>
      <div className="runbar">
        <Button className="h-10 rounded-full border border-[var(--ink)] px-5" disabled={running || !live} onClick={onRun}>
          {running && <Spinner />}
          {running ? `Running ${done}/${CASES.length}` : offCount ? `Run with ${offCount} rule${offCount > 1 ? "s" : ""} off` : "Run all cases"}
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
            <button className="case-head" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="mark">{state === "running" ? <Spinner className="size-3.5" /> : { idle: "", error: "Error", pass: "Pass", fail: "Fail" }[state]}</span>
              <span className="case-main">
                <strong>{c.label}</strong>
                <span className="muted">
                  {getPatient(c.patient)?.first}, day {c.day} · {ruleTitle(c.rule)}
                  {!rulesOn[c.rule] && " (rule off)"}
                </span>
              </span>
            </button>
            {open === c.id && (
              <div className="case-body">
                <p className="said">{c.message}</p>
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
    </>
  );
}
