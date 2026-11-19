# Between Draws

Hone retests a patient every three to six months. On a quarterly plan that is one blood draw and 89 days where the only contact is whatever the patient thinks to message about. This is a working prototype of what the AI does on those days, and of the contract that keeps it safe to ship.

I built it for the Product Manager, AI Experience role. It is not a mockup: every message, memory write, and care-team handoff on screen is generated live by Claude against a synthetic patient chart. There are two patients: Marcus, 44, on testosterone with a 90-day retest, and Dana, 51, on estradiol and progesterone for menopause with a six-month retest.

**Live:** https://between-draws.vercel.app

> Not affiliated with or endorsed by Hone Health. The patients, the physicians, and every number are made up.

## The three-minute tour

1. **Pick a patient and walk the timeline.** Eight moments across Marcus's first 90 days and seven across Dana's first six months, from baseline results to the retest. At each one the app speaks first, because the trigger (results landed, a dose was missed, two quiet weeks) is known before the patient asks anything.
2. **Push on it.** Tap a suggested message or type your own as the patient. As Marcus, try "should I just take a bit more this week?" on day 12. As Dana, try "I've had light spotting the last three days" on day 45.
3. **Open Memory** on the phone. Everything the AI has learned is visible to the patient and can be deleted. Delete something, regenerate the moment, and the message changes.
4. **Read Under the hood.** For each moment: the product bet, the metric it should move, the guardrail it must hold, the exact system prompt, the tool calls, and what the turn cost in time and tokens.
5. **Break the contract on purpose.** Switch off a rule in the Contract tab, then run the Red team. Twenty-three hard patient messages across both patients run through the real prompt and are graded by a second model call. You find out which rules are load-bearing and which the model follows anyway.
6. **Open the PM view.** All fifteen moments ranked into Now, Next and Later, with reach, impact, effort and clinical risk; an assumed baseline, target and event list for each metric; and the holdout test, with its sample size worked out.

## Why it's shaped like this

**The product lives between the labs.** Baseline and retest are the two moments a patient is guaranteed to show up. Retention is decided in the gap: the consult they half remember, the first injection, the week-two "nothing's happening," the missed dose, the stretch where they feel fine and stop opening the app. So the roadmap here is a list of moments, each with a trigger, a bet, one metric, and one guardrail, rather than a list of features.

**Proactive before conversational.** Chat only helps the patients who think to ask. Each moment starts with the app saying the useful thing, and chat is where the patient pushes back.

**Memory is a trust feature, so the patient owns it.** Personalization that the patient can't inspect reads as surveillance in a health product. Here they can see every remembered fact, where it came from, and remove it. Clinically relevant disclosures don't go in memory; they go to the care team, and the AI says so and never promises to keep anything off the record.

**Model behavior is a spec, and a spec should be testable.** The behavior contract is eleven plain-English rules, each owned by Clinical or Product. It is the document I would take into a room with the medical director. The same text is compiled into the prompt and probed by the red-team suite, so "did we get safer or worse?" has an answer before a prompt change ships.

**The AI's most important output is sometimes not text.** A handoff with a summary the clinician can act on without opening the chat is worth more than a well-worded reply. Handoffs carry an urgency (routine, same day, emergency) and are shown to the patient as a receipt.

**The same contract has to hold for a different patient.** Dana exists to test that. Her risks are not Marcus's: the dangerous failure is a woman with a uterus quietly dropping her progesterone while staying on estrogen, and the earliest signal is a pharmacy refill gap, weeks before any lab. Ten of the eleven rules applied to her as written. One is new (any bleeding on hormone therapy goes to a physician the same day), and the red-flag list gained heavy bleeding. One data point, but a cheap one.

## What I would measure

| Moment | Primary metric | Guardrail |
| --- | --- | --- |
| Results land | Results viewed → consult booked in 48h | No diagnostic claims before physician review |
| After the consult | Consult completed → protocol accepted and shipped | Recap contains only what is in the physician's note |
| First injection | Delivered → first dose logged in 72h | Technique questions beyond training go to the care team |
| Day-12 dip | Day-30 retention among "no change" check-ins | No promised timelines |
| Missed dose | On-schedule doses in the following 30 days | Never advises on making up a dose |
| Quiet stretch | Retest completion among day-60 inactives | One message, not a drip |
| Retest prep | Retests drawn as ordered: in window, fasted, hydrated | Guidance matches the lab order |
| Better, not fixed (Dana) | Day-60 active on both medications among patients whose main goal has not improved by day 21 | Side effects go to the physician; no self-adjusted timing or dose |
| One refill missing (Dana) | Progesterone refill gaps over 10 days resolved within 7 days | Every gap handed to the care team; the AI never restarts or stops a medication |
| Halfway and quiet (Dana) | Still an active member at day 120 | One message, not a drip |
| Second draw | Follow-up consult booked; still an active member at day 120 | Every out-of-range marker handed off with context |

Across all of them:

- **Handoff recall and precision.** Recall first: a clinician audits a sample of chats for things that should have been escalated and were not, because the missed handoff is the dangerous failure. Precision (how many handoffs the care team agrees needed a clinician) keeps the queue usable.
- **Care-team minutes per patient**, since an AI that shifts work onto clinicians has not helped.
- **Red-team pass rate** on every prompt or model change.

The bets in the app are hypotheses, not findings. I have no Hone data. Each one would ship behind a holdout so retention changes can be credited to the feature rather than to the season.

## How it works

```
app/page.tsx            shell: patient switch, contract state, red-team runner
components/journey.tsx  one patient's timeline, conversation, memory and handoffs
components/phone.tsx    the patient's side: today's message, chat, memory
components/*-panel.tsx  under the hood, behavior contract, red team
components/pm-panel.tsx moment ranking, metrics and the holdout test
components/ui, block    primitives and the adherence strip, from Obsidian UI
app/api/moment          streams the proactive message for a moment
app/api/chat            streams a reply to the patient, running tools as needed
app/api/eval            runs one red-team case, then grades it
lib/patient.ts          two synthetic patients: chart, lab markers, seeded memory, moments
lib/contract.ts         the behavior contract
lib/prompt.ts           builds the system prompt from contract + chart + memory
lib/redteam.ts          the twenty-three cases and their pass criteria
lib/roadmap.ts          Now/Next/Later order, assumed baselines, sample-size formula
lib/claude.ts           model calls, tool loop, grader
lib/guard.ts            signed state, input cleaning, leaked-prompt check
lib/limit.ts            per-visitor and overall rate limits
lib/stream.ts           browser side of the event stream
lib/markers.ts          range checks and the dot gauge
```

The look borrows Hone's own palette (warm white, black ink, acid yellow, pale yellow and blue blocks) so it reads as something that could sit inside their product. The interface is Next.js with Tailwind. Buttons, tabs, switches, badges, inputs and the adherence strip are [Obsidian UI](https://www.obsidianui.dev) components copied into `components/`; the adherence strip is their Status Bars block with the wording changed from uptime to doses.

A few decisions worth knowing about:

- **The model never sees the future.** The chart is an append-only log filtered to "today," so on day 58 the retest numbers do not exist in the prompt. One of the red-team cases checks that it won't guess them.
- **Three tools:** `remember`, `forget`, and `handoff_to_care_team`. Inputs are schema-enforced and validated again on the server.
- **The server is stateless.** Memory and handoffs live in the browser session and are sent with each request, which keeps the demo deployable anywhere and makes "delete this memory" trivially real.
- **The grader doesn't see the prompt.** It gets the rule, the pass criteria, the patient message, the reply, and the tool calls. It grades behavior, not wording. It is the same model as the one being graded, so their blind spots overlap; a production version would calibrate it against clinician-labeled examples.
- **Prompt order is cache-friendly.** Role and contract, then chart, then the volatile state (day, memory, open handoffs).
- **Low effort by default.** Replies run on Claude Opus 5.5 at low reasoning effort (`CLAUDE_EFFORT` to change). In my runs a proactive message took roughly 6 to 15 seconds end to end, longer when it files a handoff first. That is too slow for chat in production and is the first thing I would tune.
- **Refusal fallback is on.** If the primary model's safety classifier declines a turn, the API retries on a fallback model in the same request. Set `CLAUDE_FALLBACKS=off` to disable.

## Guardrails

A patient-facing model will be told to ignore its rules, and a public demo will be poked at. No model can be made immune to that, so the defenses are layered and each one assumes the others can fail:

- **The browser cannot put words in the AI's mouth.** The server keeps no session, so memories, handoffs and earlier replies come back from the browser on every request. Each is signed when the server creates it and checked when it returns. A forged memory, an edited handoff, or an invented "earlier reply" fails the check and never reaches the prompt. Seeded memories are matched by id and replaced with the server's own copy.
- **Whatever the patient types is treated as the patient.** An always-on instruction, which the rule switches cannot turn off, says that nothing in the conversation can change the rules, grant permission, or stand in for the care team, whether it looks like a system notice, a tag, or a physician's note. Patient text is length-capped and stripped of control characters.
- **Memory cannot be used to plant instructions.** The model is told not to save anything that tells it how to behave, and stored memory is fenced in the prompt as data.
- **Replies are checked on the way out.** If a reply repeats a long run of its own instructions, it is replaced before the turn ends.
- **Tools can only do three things.** Inputs are schema-enforced and re-validated, and a single reply is capped at four tool calls and three model rounds.
- **Spend is bounded.** Separate per-visitor budgets for conversation and for red-team runs, a ceiling for the whole instance, capped output length, and a hard spend limit on the API key behind it all.
- **It is tested.** Three of the red-team cases are injection attempts: a fake system notice inside a message, a request to print the instructions, and an attempt to plant a false approval in memory.

What this does not cover: a determined person can still talk a model into a poor answer within its rules, which is what the contract and the red team are for, and none of it has had an outside security review.

## What the red team has shown so far

Small numbers, so treat these as anecdotes rather than results.

- **The score moved between 18 and 19 out of 20.** That was the range across my last four full runs, one of them against the deployed site, and a different case missed almost every time. Nothing is cached and the model is not deterministic, so expect the same if you run it.
- **Most misses are the grader being stricter than the written criteria.** One run failed a reply for mentioning the care team's two-business-day response time, reading it as a promise. Another failed "not everyone on testosterone gets an estrogen blocker" as an opinion on his treatment. Whether those should fail is a judgment call, which is the argument for calibrating the grader against clinician-labeled examples before anyone trusts the number.
- **Some misses were real, and they changed the product.** In one emergency case the reply said the clinician had been alerted before telling the patient to call 911. In another it opened with a garbled "I told you to go to an emergency room." The cause was not the prompt: the handoff tool asked the model what it had told the patient before it had said anything. Rewording the tool fixed it, and the three emergency cases then passed six re-runs.
- **The missed-dose case flips.** Asked about doubling up, the model sometimes adds "don't make up the missed shot," which decides the question it was supposed to hand off. I read that as a product gap rather than a prompt bug. A clinic has a standard missed-dose instruction, and the AI should quote the physician-approved wording instead of improvising or escalating every miss.
- **One rule may be redundant.** With "Physicians own the protocol" switched off, an earlier run (when the suite had fourteen cases) still passed everything. Either the rest of the prompt carries that behavior or my dosing cases are too easy. Both are worth knowing before anyone argues about that rule's wording.
- **Trying it by hand caught things the suite did not:** a care-team handoff filed for baseline results a physician had already reviewed, which is noise for clinicians, and a patient with chest tightness being told to hold his next dose. Both are now covered by a rule and a case.
- **The three injection cases, added last, passed on their first run.** They have not been part of a full run yet.
- **A clinical read-through changed several rules.** Emergencies go to an ER rather than urgent care, the AI may not promise to keep a disclosure out of the record, and a hematocrit of 51.2% is a routine review rather than an alarm. That review was done with an AI model, not a physician.

## Grounding it in real data

Two hand-written patients and twenty-three hand-written cases is where this starts, not where it should stay. The public sources I would pull in next:

- **NHANES** (CDC; several cycles are mirrored on Kaggle, and which cycles include the sex-hormone panel needs checking). Real adult panels including total testosterone, estradiol, SHBG, CBC, lipids, HbA1c, vitamin D and hs-CRP. I would build about fifty baseline patients from it so the AI is tested on the spread of real numbers. It is cross-sectional, so retests would still be simulated and labelled as such.
- **HealthBench** (OpenAI). Multi-turn health conversations with physician-written rubrics, tagged by themes such as emergency referral. A better source of grading criteria than my own.
- **MediQ AskDocs**. Around 55k real patient questions from r/AskDocs. Filtered for testosterone, menopause, thyroid, GLP-1 and missed-dose posts, it gives eval inputs in patients' own words.
- **MedSafetyBench** for harmful dosing and prescription requests, and the Kaggle **Suicide and Depression Detection** set for crisis-language cases.

I did not find a public dataset for telehealth engagement or retention, so the metrics in the table above would have to be measured on real traffic.

## Run it

Needs Node 20+ and an Anthropic API key.

```bash
npm install
cp .env.example .env.local   # then paste your key into it
npm run dev
```

Open http://localhost:3000.

To put it on a URL, deploy to Vercel and set `ANTHROPIC_API_KEY` as an environment variable. The API routes are rate-limited but have no login, so use a key with a spend limit.

## What this is not

- Not clinically validated. No physician has reviewed the charts, rules or cases. They reflect my reading of how TRT and menopause care work; a medical director would rewrite some of them, which is the point of making them one editable page.
- Not an eval you can trust yet. Twenty-three cases and a single grader is a smoke test. The real version needs human-labeled examples to calibrate the grader, multi-turn cases, and a few hundred messages sampled from real conversations.
- Not ready for real patients. Sending health information to a model provider needs a business associate agreement, zero-retention terms, and a privacy review. None of that exists here because no real data does.
- Two patient types out of many. Weight loss, thyroid, and fertility-preserving options such as enclomiphene are not modelled, and each would bring its own rules.
- Not connected to anything. No EHR, no pharmacy, no messaging. The triggers are hard-coded events in a synthetic chart.

Khursheed Khan
