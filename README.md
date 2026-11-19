# Between Draws

Hone sees a patient's blood every 90 days. This is a working prototype of what the AI does on the other 89, and of the contract that keeps it safe to ship.

I built it for the Product Manager, AI Experience role. It is not a mockup: every message, memory write, and care-team handoff on screen is generated live by Claude against a synthetic patient chart.

> Not affiliated with or endorsed by Hone Health. The patient, the physician, and every number are made up.

## The three-minute tour

1. **Walk the timeline.** Seven moments across one patient's first 90 days, from baseline results to the retest. At each one the app speaks first, because the trigger (results landed, a dose was missed, two quiet weeks) is known before the patient asks anything.
2. **Push on it.** Tap a suggested message or type your own as the patient. Try "should I just take a bit more this week?" on day 12, or "my wife and I are thinking about another kid" on day 58.
3. **Open Memory** on the phone. Everything the AI has learned is visible to the patient and can be deleted. Delete something, regenerate the moment, and the message changes.
4. **Read Under the hood.** For each moment: the product bet, the metric it should move, the guardrail it must hold, the exact system prompt, the tool calls, and what the turn cost in time and tokens.
5. **Break the contract on purpose.** Switch off a rule in Behavior contract, then run the Red team. Fourteen hard patient messages run through the real prompt and are graded by a second model call. You find out which rules are load-bearing and which the model follows anyway.

## Why it's shaped like this

**The product lives between the labs.** Baseline and retest are the two moments a patient is guaranteed to show up. Retention is decided in the gap: the first injection, the week-two "nothing's happening," the missed dose, the stretch where they feel fine and stop opening the app. So the roadmap here is a list of moments, each with a trigger, a bet, one metric, and one guardrail, rather than a list of features.

**Proactive before conversational.** Chat only helps the patients who think to ask. Each moment starts with the app saying the useful thing, and chat is where the patient pushes back.

**Memory is a trust feature, so the patient owns it.** Personalization that the patient can't inspect reads as surveillance in a health product. Here they can see every remembered fact, where it came from, and remove it. The model is told not to store sensitive disclosures unless asked.

**Model behavior is a spec, and a spec should be testable.** The behavior contract is ten plain-English rules, each owned by Clinical or Product. It is the document I would take into a room with the medical director. The same text is compiled into the prompt and probed by the red-team suite, so "did we get safer or worse?" has an answer before a prompt change ships.

**The AI's most important output is sometimes not text.** A handoff with a summary the clinician can act on without opening the chat is worth more than a well-worded reply. Handoffs carry an urgency (routine, same day, emergency) and are shown to the patient as a receipt.

## What I would measure

| Moment | Primary metric | Guardrail |
| --- | --- | --- |
| Results land | Results viewed → consult booked in 48h | No diagnostic claims before physician review |
| First injection | Delivered → first dose logged in 72h | Technique questions beyond training go to the care team |
| Day-12 dip | Day-30 retention among "no change" check-ins | No promised timelines |
| Missed dose | On-schedule doses in the following 30 days | Never advises on making up a dose |
| Quiet stretch | Retest completion among day-60 inactives | One message, not a drip |
| Retest prep | Retests drawn in-window and fasted | Guidance matches the lab order |
| Second draw | Follow-up consult booked; renewal | Every out-of-range marker handed off with context |

Across all of them: handoff precision (how many the care team agrees needed a clinician) and red-team pass rate on every prompt or model change.

## How it works

```
app/page.tsx            the whole screen: timeline, phone, and the three panels
app/api/moment          streams the proactive message for a moment
app/api/chat            streams a reply to the patient, running tools as needed
app/api/eval            runs one red-team case, then grades it
lib/patient.ts          synthetic chart, lab markers, seeded memory, the seven moments
lib/contract.ts         the behavior contract
lib/prompt.ts           builds the system prompt from contract + chart + memory
lib/redteam.ts          the fourteen cases and their pass criteria
lib/claude.ts           model calls, tool loop, grader
```

A few decisions worth knowing about:

- **The model never sees the future.** The chart is an append-only log filtered to "today," so on day 58 the retest numbers do not exist in the prompt. One of the red-team cases checks that it won't guess them.
- **Three tools:** `remember`, `forget`, and `handoff_to_care_team`. Inputs are schema-enforced and validated again on the server.
- **The server is stateless.** Memory and handoffs live in the browser session and are sent with each request, which keeps the demo deployable anywhere and makes "delete this memory" trivially real.
- **The grader doesn't see the prompt.** It gets the rule, the pass criteria, the patient message, the reply, and the tool calls. It grades behavior, not wording.
- **Prompt order is cache-friendly.** Role and contract, then chart, then the volatile state (day, memory, open handoffs).
- **Refusal fallback is on.** If the primary model's safety classifier declines a turn, the API retries on a fallback model in the same request. Set `CLAUDE_FALLBACKS=off` to disable.

## Run it

Needs Node 20+ and an Anthropic API key.

```bash
npm install
cp .env.example .env.local   # then paste your key into it
npm run dev
```

Open http://localhost:3000.

To put it on a URL, deploy to Vercel and set `ANTHROPIC_API_KEY` as an environment variable. There is no auth or rate limiting in front of the API routes, so use a key with a spend limit.

## What this is not

- Not clinically validated. The contract and cases reflect my reading of how TRT care works; a medical director would rewrite some of them, which is the point of making them one editable page.
- Not an eval you can trust yet. Fourteen cases and a single grader is a smoke test. The real version needs human-labeled examples to calibrate the grader, multi-turn cases, and a few hundred messages sampled from real conversations.
- Not connected to anything. No EHR, no pharmacy, no messaging. The triggers are hard-coded events in a synthetic chart.

Khursheed Khan
