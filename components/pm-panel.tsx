import { Badge } from "@/components/ui/badge";
import { MOMENT_COUNT, PER_ARM, PER_ARM_FALLBACK, ROADMAP, TEST, type Level } from "@/lib/roadmap";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const pts = (x: number) => Math.round(x * 100);
const tag = "font-mono font-normal uppercase tracking-wider text-[var(--muted)]";
const RISK: Record<Level, string> = { Low: "text-[var(--ok)]", Medium: "text-[var(--amber)]", High: "text-[var(--coral)]" };

const measured = ROADMAP.filter((g) => g.phase !== "Later").flatMap((g) => g.items.map((item, i) => ({ phase: g.phase, rank: i + 1, ...item })));

// The product plan behind the moments: order, measurement, and how to tell if any of it worked.
export function PmPanel() {
  const p1 = TEST.baseline;
  const p2 = TEST.baseline + TEST.lift;
  const pbar = (p1 + p2) / 2;
  return (
    <>
      <p className="intro">
        This is how I would sequence the {MOMENT_COUNT} moments across a first two quarters, and how I would know whether each one worked. I have no
        Hone data, so every baseline below is an assumption for me to replace, not a finding.
      </p>

      <h2>Now, next, later</h2>
      {ROADMAP.map((g) => (
        <section key={g.phase} className="pm-group">
          <h3 className="pm-phase">{g.phase}</h3>
          <p className="small muted">{g.note}</p>
          <ol className="pm-list">
            {g.items.map((item, i) => (
              <li key={item.moment.id} className="pm-item">
                <span className="pm-rank">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{item.moment.title}</strong> <span className="pm-who">{item.first}, day {item.moment.day}</span>
                  <p>{item.why}</p>
                  <div className="pm-scores">
                    <Badge variant="secondary" className={tag}>
                      Reach · {item.reach}
                    </Badge>
                    <Badge variant="secondary" className={tag}>
                      Impact · {item.impact}
                    </Badge>
                    <Badge variant="secondary" className={tag}>
                      Effort · {item.effort}
                    </Badge>
                    <Badge variant="secondary" className={`font-mono font-normal uppercase tracking-wider ${RISK[item.risk]}`}>
                      Clinical risk · {item.risk}
                    </Badge>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <h2>How each one would be measured</h2>
      <p className="small muted pm-lead">Now and Next only. Baselines are my guesses until I see the real funnel; targets are deliberately modest.</p>
      <div className="pm-scroll" role="region" aria-label="Metrics for the Now and Next moments">
        <table className="pm-table">
          <thead>
            <tr>
              <th scope="col">Moment</th>
              <th scope="col">Metric</th>
              <th scope="col">Baseline</th>
              <th scope="col">Target</th>
              <th scope="col">Events to log</th>
              <th scope="col">Guardrail</th>
            </tr>
          </thead>
          <tbody>
            {measured.map((row) => (
              <tr key={row.moment.id}>
                <th scope="row">
                  <div>
                    <strong>{row.moment.title}</strong>
                    <span className="pm-who">
                      {row.first} · {row.phase} {row.rank}
                    </span>
                  </div>
                </th>
                <td data-label="Metric">
                  <div>{row.moment.metric}</div>
                </td>
                <td data-label="Baseline">
                  <div>
                    <span className="pm-num">{row.measure?.baseline ?? "–"}</span>
                    <Badge variant="secondary" className={`mt-1 text-[10px] ${tag}`}>
                      assumed
                    </Badge>
                  </div>
                </td>
                <td data-label="Target">
                  <div>
                    <span className="pm-num">{row.measure?.target ?? "–"}</span>
                  </div>
                </td>
                <td data-label="Events">
                  <div className="pm-events">
                    {row.measure?.events.map((e) => (
                      <code key={e}>{e}</code>
                    ))}
                  </div>
                </td>
                <td data-label="Guardrail">
                  <div>{row.moment.guardrail}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>How I would test it</h2>
      <ul className="facts">
        <li>
          <b>Unit</b> The patient. Assigned once at signup and kept there, so nobody sees half the moments.
        </li>
        <li>
          <b>Holdout</b> New starters split 50/50 between AI moments on and today&rsquo;s experience. Existing patients stay out of the test.
        </li>
        <li>
          <b>Primary</b> Day-30 retention among new starters: still an active member 30 days after their first shipment.
        </li>
        <li>
          <b>Guardrails</b> Handoff recall from a clinician audit of sampled conversations, and care-team minutes per patient. If either gets
          worse, I stop the test whatever retention does.
        </li>
        <li>
          <b>Blinding</b> The clinicians auditing handoffs review samples from both arms without knowing which arm a patient is in.
        </li>
      </ul>

      <span className="label mt-6">Sample size</span>
      <div className="stats">
        <div>
          <b>{pct(p1)}</b>
          <span>assumed day-30 retention</span>
        </div>
        <div>
          <b>+{pts(TEST.lift)} pts</b>
          <span>smallest lift worth detecting</span>
        </div>
        <div>
          <b>{TEST.alpha}</b>
          <span>alpha, two-sided</span>
        </div>
        <div>
          <b>{TEST.power}</b>
          <span>power</span>
        </div>
        <div>
          <b>{PER_ARM.toLocaleString("en-US")}</b>
          <span>patients per arm</span>
        </div>
      </div>
      <p className="small mono pm-formula">
        n = ({TEST.zAlpha}·√(2·{pbar.toFixed(2)}·{(1 - pbar).toFixed(2)}) + {TEST.zBeta}·√({p1.toFixed(2)}·{(1 - p1).toFixed(2)} + {p2.toFixed(2)}·
        {(1 - p2).toFixed(2)}))² / {TEST.lift.toFixed(2)}² = {PER_ARM.toLocaleString("en-US")} per arm, {(PER_ARM * 2).toLocaleString("en-US")} new
        starters in total
      </p>
      <p className="small pm-note">
        If Hone does not start {(PER_ARM * 2).toLocaleString("en-US")} new patients in a quarter, I would either accept a larger minimum lift (
        {pts(TEST.fallbackLift)} points needs {PER_ARM_FALLBACK.toLocaleString("en-US")} per arm) or switch the primary to a leading metric such as
        first dose logged within 72 hours, which moves weeks sooner.
      </p>

      <h2>First 90 days</h2>
      <ul className="facts">
        <li>
          <b>Baselines</b> Replace every assumed number above with the real funnel, and interview a dozen patients who cancelled in their first two
          months, before I commit to this order.
        </li>
        <li>
          <b>Clinical</b> Sit with the clinical team until the behaviour contract is a document they have signed off, including the exact missed-dose
          wording the AI is allowed to quote.
        </li>
        <li>
          <b>Ship</b> Put the first Now moment, results explained, live behind the holdout, with its events logging from day one.
        </li>
      </ul>
    </>
  );
}
