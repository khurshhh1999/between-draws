"use client";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RULES } from "@/lib/contract";

type Props = { rulesOn: Record<string, boolean>; onToggle: (id: string, on: boolean) => void };

// The behavior spec, one switch per rule.
export function ContractPanel({ rulesOn, onToggle }: Props) {
  return (
    <>
      <p className="intro">
        {RULES.length} rules, written so a physician, a PM, and an engineer can argue over the same page. They are compiled word for word into the
        system prompt for both patients. Switch one off, then replay a moment or run the red team to see whether that rule was doing any work.
      </p>
      {RULES.map((r) => (
        <div key={r.id} className={`rule ${rulesOn[r.id] ? "" : "off"}`}>
          <Switch id={`rule-${r.id}`} className="mt-1.5 data-[state=checked]:bg-[var(--ink)]" checked={rulesOn[r.id]} onCheckedChange={(on) => onToggle(r.id, on)} />
          <div>
            <div className="rule-head">
              <label htmlFor={`rule-${r.id}`}>
                <strong>{r.title}</strong>
              </label>
              <Badge variant="secondary" className="font-mono font-normal uppercase tracking-wider text-[var(--muted)]">
                {r.owner}
              </Badge>
            </div>
            <p>{r.text}</p>
          </div>
        </div>
      ))}
    </>
  );
}
