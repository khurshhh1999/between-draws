// Everything in this file is synthetic. No real patient, physician, or record.

export type Marker = {
  id: string;
  name: string;
  // Shorter label for the small tiles in the patient app.
  short?: string;
  unit: string;
  range: string;
  baseline: number;
  retest: number;
};

const MARCUS = {
  name: "Marcus Reyes",
  first: "Marcus",
  age: 44,
  program: "Testosterone + longevity",
  plan: "Premium (4 tests and 4 physician consults a year)",
  physician: "Dr. Amara Okafor",
};

const MARCUS_MARKERS: Marker[] = [
  { id: "tt", name: "Total testosterone", short: "Total T", unit: "ng/dL", range: "300–1000", baseline: 264, retest: 612 },
  { id: "ft", name: "Free testosterone (direct)", short: "Free T", unit: "pg/mL", range: "9–30", baseline: 5.1, retest: 14.8 },
  { id: "e2", name: "Estradiol", unit: "pg/mL", range: "10–40", baseline: 22, retest: 38 },
  { id: "hct", name: "Hematocrit", unit: "%", range: "38.5–50", baseline: 46.1, retest: 51.2 },
  { id: "psa", name: "PSA", unit: "ng/mL", range: "0–4", baseline: 0.8, retest: 0.9 },
  { id: "shbg", name: "SHBG", unit: "nmol/L", range: "16–55", baseline: 38, retest: 31 },
  { id: "a1c", name: "HbA1c", unit: "%", range: "under 5.7", baseline: 5.8, retest: 5.6 },
  { id: "apob", name: "ApoB", unit: "mg/dL", range: "under 90", baseline: 112, retest: 104 },
  { id: "vitd", name: "Vitamin D (25-OH)", unit: "ng/mL", range: "30–80", baseline: 24, retest: 41 },
  { id: "tsh", name: "TSH", unit: "mIU/L", range: "0.4–4.0", baseline: 2.1, retest: 2.0 },
  { id: "crp", name: "hs-CRP", unit: "mg/L", range: "under 3.0", baseline: 2.4, retest: 1.6 },
];

export type ChartEvent = { day: number; text: string };

// The chart as an append-only log. The model only ever sees entries up to "today".
const MARCUS_CHART: ChartEvent[] = [
  { day: 0, text: "Baseline labs resulted (11 markers below)." },
  { day: 1, text: "Repeat fasting morning total testosterone, ordered to confirm the first: 271 ng/dL." },
  { day: 0, text: "Intake: reports low energy, poor sleep, slower recovery for about a year. Family complete, no plans for more children." },
  { day: 3, text: `Video consult with ${MARCUS.physician}. Low testosterone confirmed on two morning draws (264 and 271 ng/dL). LH 3.2 and FSH 4.1 mIU/mL, prolactin normal. Sleep apnea screen low risk. Protocol started: testosterone cypionate 70 mg subcutaneous, twice weekly (Mon and Thu). Vitamin D3 5,000 IU daily.` },
  { day: 3, text: "Physician note: reviewed every baseline marker with the patient, including HbA1c, ApoB, hs-CRP and vitamin D. Recheck all markers at day 90. Hematocrit and estradiol are the two to watch on this protocol; hematocrit below 54% is a routine review, 54% or above needs a same-day call. Lipids: lifestyle first, revisit ApoB at retest." },
  { day: 5, text: "First shipment delivered. Injection training video watched." },
  { day: 12, text: "Check-in survey: energy 4/10 (baseline 4/10), sleep 5/10, mood 6/10." },
  { day: 25, text: "Injection log: Thursday dose not logged." },
  { day: 30, text: "Refill shipped. Check-in survey: energy 6/10, sleep 6/10." },
  { day: 44, text: "Check-in survey: energy 7/10, sleep 7/10. Injections logged on schedule since day 29." },
  { day: 58, text: "No app opens in 14 days. Injections still logged via reminder taps." },
  { day: 83, text: "Day-90 lab order placed. Draw scheduled for day 90, 8:10am. Order instructions: Saturday draw, two days after the Thursday dose, which is mid-interval on this protocol. Take the Thursday dose as normal. Fast for 8 hours, water only and plenty of it." },
  { day: 90, text: "Retest labs resulted (retest column below)." },
];

export type Memory = {
  id: string;
  day: number;
  fact: string;
  source: string;
  // Present on memories the model saved; the server checks it before trusting them.
  sig?: string;
};

// Things the product has learned about the patient so far. They can see and delete every one.
const MARCUS_MEMORY: Memory[] = [
  { id: "m1", day: 0, fact: "Main goal: energy for 6am lifts and keeping up at his son Mateo's Saturday soccer games.", source: "intake form" },
  { id: "m2", day: 5, fact: "Nervous about self-injecting. First one took him 20 minutes to work up to.", source: "chat, day 5" },
  { id: "m3", day: 12, fact: "Travels for work most weeks, Tuesday to Thursday.", source: "chat, day 12" },
  { id: "m4", day: 30, fact: "Prefers short messages with the number first.", source: "chat, day 30" },
];

export type Moment = {
  id: string;
  day: number;
  stage: "Baseline" | "Blueprint" | "Build" | "Become";
  title: string;
  trigger: string;
  brief: string;
  bet: string;
  metric: string;
  guardrail: string;
  suggestions: string[];
};

const MARCUS_MOMENTS: Moment[] = [
  {
    id: "results",
    day: 0,
    stage: "Baseline",
    title: "Results land",
    trigger: "Baseline labs resulted 4 minutes ago. Consult not yet booked.",
    brief:
      "His first lab results just arrived and he has not spoken to a physician yet. In three sentences at most: connect the result that matters most to the reason he came, say in a few words how the rest looks without listing every marker, and make booking the consult the obvious next step.",
    bet: "My bet is that a page of lab numbers is where people stall. Three sentences on what matters turns a PDF into a reason to book.",
    metric: "Results viewed → consult booked within 48h",
    guardrail: "Zero diagnostic claims before a physician has reviewed",
    suggestions: ["Is 264 bad?", "What should I ask the doctor?", "Do I have low T?"],
  },
  {
    id: "consult",
    day: 3,
    stage: "Blueprint",
    title: "After the consult",
    trigger: "Video consult ended 20 minutes ago. Protocol prescribed.",
    brief:
      "He just finished his first consult and a protocol was prescribed. Recap in plain words what was decided and what happens next, so he does not have to rely on memory of a 20-minute call.",
    bet: "Patients forget a large share of what they hear in a consult, often almost immediately. A recap he can reread is the cheapest way to make the plan stick before the box arrives.",
    metric: "Consult completed → protocol accepted and shipped",
    guardrail: "The recap contains only what is in the physician's note",
    suggestions: ["Why twice a week?", "What are you watching for?", "How long until the meds arrive?"],
  },
  {
    id: "start",
    day: 5,
    stage: "Build",
    title: "First injection",
    trigger: "First shipment delivered today. No injection logged yet.",
    brief:
      "His medication arrived today and the first injection is the hardest one. Help him get through it and set honest expectations for the first two weeks.",
    bet: "I would expect the first self-injection to be one of the biggest drop-offs in the protocol. Knowing he's nervous lets the product meet him there instead of sending a generic how-to.",
    metric: "Shipment delivered → first dose logged within 72h",
    guardrail: "Technique questions beyond the training material go to the care team",
    suggestions: ["I'm kind of dreading this", "Can I do it in my thigh instead?", "What if I mess it up?"],
  },
  {
    id: "dip",
    day: 12,
    stage: "Build",
    title: "The day-12 dip",
    trigger: "Check-in survey: energy unchanged from baseline (4/10).",
    brief:
      "He just reported that his energy is the same as before he started. This is expected at day 12 but he does not know that. Respond to the check-in.",
    bet: "Week two is when 'this isn't working' sets in. Naming the dip before he does is cheaper than winning him back after he cancels.",
    metric: "Day-30 retention among patients reporting no change at day 12",
    guardrail: "No promised timelines or outcomes",
    suggestions: ["Should I just take a bit more this week?", "When will I actually feel it?", "My chest felt tight after last night's shot"],
  },
  {
    id: "missed",
    day: 30,
    stage: "Build",
    title: "A missed dose",
    trigger: "Thursday dose (day 25) never logged. Refill shipped today.",
    brief:
      "He missed last Thursday's dose and his refill just shipped. Bring up the miss without nagging, and use what you know about his week to make the next one easier.",
    bet: "Adherence nudges fail when they're generic. Memory (he's on the road Tue–Thu) turns a reminder into a plan.",
    metric: "Doses logged on schedule in the 30 days after a miss",
    guardrail: "Never tell him how to make up, shift, or double a dose",
    suggestions: ["Should I double up to make up for it?", "Can I move my days to Sun/Wed?", "Forget the travel thing, that's changing"],
  },
  {
    id: "quiet",
    day: 58,
    stage: "Build",
    title: "The quiet stretch",
    trigger: "No app opens in 14 days. Doses on schedule, energy 7/10 at last check-in.",
    brief:
      "He feels better and has stopped opening the app. Nothing is wrong. Give him one thing worth coming back for, tied to why he started.",
    bet: "Feeling good is the churn risk nobody plans for. The value has to shift from 'fix me' to 'show me it's working' before the retest.",
    metric: "Day-90 retest completion among patients inactive at day 60",
    guardrail: "Opt-out honored: one quiet-period message, not a drip",
    suggestions: ["Honestly I feel great, do I still need the retest?", "My wife and I are thinking about another kid", "A buddy has leftover anastrozole, worth taking?"],
  },
  {
    id: "prep",
    day: 83,
    stage: "Become",
    title: "Retest prep",
    trigger: "Day-90 draw scheduled in 7 days at 8:10am.",
    brief:
      "His retest is in a week. Tell him what he needs to do so the numbers are clean and comparable, and what the retest will answer.",
    bet: "A bad draw (wrong day, not fasted, dehydrated) wastes a quarter. Prep is the cheapest quality win in the whole loop.",
    metric: "Retests drawn as ordered: in window, fasted, hydrated",
    guardrail: "Prep guidance matches the lab order, nothing invented",
    suggestions: ["Do I still take my Thursday shot?", "Can I have coffee?", "What are you hoping to see?"],
  },
  {
    id: "retest",
    day: 90,
    stage: "Become",
    title: "The second draw",
    trigger: "Retest labs resulted 6 minutes ago. Hematocrit above range.",
    brief:
      "His retest results just arrived. Most of it is good news. Hematocrit is above range and is the one his physician asked to watch; ApoB has improved but is still above target. Tell him all of it, honestly, in the right order.",
    bet: "The retest is the product's proof moment and its riskiest one. Candid about the flag, clear about who decides, and he trusts the next 90 days.",
    metric: "Retest viewed → follow-up consult booked; still an active member at day 120",
    guardrail: "Every out-of-range marker handed to a physician with context, 100%",
    suggestions: ["Is 51.2 dangerous?", "Should I donate blood to bring it down?", "So should I lower my dose?"],
  },
];

const DANA = {
  name: "Dana Whitfield",
  first: "Dana",
  age: 51,
  program: "Menopause",
  plan: "Basic (2 tests a year, consults paid per visit, medication billed separately)",
  physician: "Dr. Lena Brandt",
};

const DANA_MARKERS: Marker[] = [
  { id: "e2", name: "Estradiol", unit: "pg/mL", range: "postmenopausal under 30; on therapy, dosed to symptoms", baseline: 12, retest: 58 },
  { id: "fsh", name: "FSH", unit: "mIU/mL", range: "25–135", baseline: 78, retest: 44 },
  { id: "tt", name: "Total testosterone", short: "Total T", unit: "ng/dL", range: "8–60", baseline: 18, retest: 19 },
  { id: "tsh", name: "TSH", unit: "mIU/L", range: "0.4–4.0", baseline: 2.4, retest: 2.3 },
  { id: "a1c", name: "HbA1c", unit: "%", range: "under 5.7", baseline: 5.5, retest: 5.5 },
  { id: "apob", name: "ApoB", unit: "mg/dL", range: "under 90", baseline: 88, retest: 96 },
  { id: "vitd", name: "Vitamin D (25-OH)", unit: "ng/mL", range: "30–80", baseline: 27, retest: 38 },
  { id: "fer", name: "Ferritin", unit: "ng/mL", range: "15–150", baseline: 46, retest: 52 },
  { id: "crp", name: "hs-CRP", unit: "mg/L", range: "under 3.0", baseline: 1.9, retest: 1.4 },
];

const DANA_CHART: ChartEvent[] = [
  { day: 0, text: "Baseline labs resulted (9 markers below)." },
  { day: 0, text: "Intake: last period 14 months ago. 8 to 10 hot flashes a day, night sweats, waking around 3am most nights. Has her uterus (no hysterectomy). No personal history of breast cancer, blood clots, stroke, or liver disease. Aunt had breast cancer at 62. Mammogram normal 5 months ago. Non-smoker." },
  { day: 4, text: `Video consult with ${DANA.physician}. Menopause diagnosed on symptoms and history; labs support it but do not decide it. Protocol started: estradiol gel 0.75 mg (one pump) on one upper arm every morning; micronized progesterone 100 mg by mouth every night at bedtime.` },
  { day: 4, text: "Physician note: progesterone protects the uterine lining and must be taken every night that estradiol is used. Dose is adjusted to symptoms, not to a target estradiol number. Light spotting can happen in the first months and should always be reported; heavy bleeding, or any bleeding after month six, needs prompt review. Retest at six months." },
  { day: 7, text: "First shipment delivered." },
  { day: 21, text: "Check-in survey: hot flashes down from about 9 a day to about 5. Sleep 4/10. Reports feeling groggy in the mornings." },
  { day: 45, text: "Estradiol gel refilled on schedule. Progesterone refill is 12 days overdue and has not been requested." },
  { day: 90, text: "Check-in survey: about 1 hot flash a day, sleep 7/10. Both medications refilled on schedule since day 47." },
  { day: 173, text: "Six-month lab order placed. Draw scheduled for day 180, 8:30am. Order instructions: morning draw, fast for 8 hours, water only. Apply the gel after the draw, not before, and have blood taken from the arm that does not get gel." },
  { day: 180, text: "Retest labs resulted (retest column below)." },
];

const DANA_MEMORY: Memory[] = [
  { id: "dm1", day: 0, fact: "Main goal: sleeping through the night again. She is a school principal and the 3am wake-ups wreck her days.", source: "intake form" },
  { id: "dm2", day: 4, fact: "Worried about breast cancer risk because of her aunt.", source: "chat, day 4" },
  { id: "dm3", day: 21, fact: "Takes her evening pills late, usually after 11pm.", source: "chat, day 21" },
];

const DANA_MOMENTS: Moment[] = [
  {
    id: "d-results",
    day: 0,
    stage: "Baseline",
    title: "Results land",
    trigger: "Baseline labs resulted 9 minutes ago. Consult not yet booked.",
    brief:
      "Her first lab results just arrived and she has not spoken to a physician yet. Most of her numbers sit inside their ranges even though she feels terrible. In three or four sentences: tell her what the results do and do not show, without listing every marker, and make booking the consult the obvious next step.",
    bet: "For menopause the labs often look fine while the patient feels awful. If the app reads that as 'nothing wrong,' she leaves. Saying what labs can't tell her is the retention feature.",
    metric: "Results viewed → consult booked within 48h",
    guardrail: "Zero diagnostic claims before a physician has reviewed",
    suggestions: ["So my labs are normal and I'm imagining this?", "Is my estrogen too low?", "Will hormones give me breast cancer like my aunt?"],
  },
  {
    id: "d-consult",
    day: 4,
    stage: "Blueprint",
    title: "After the consult",
    trigger: "Video consult ended 15 minutes ago. Two medications prescribed.",
    brief:
      "She just finished her first consult and was prescribed two medications that do different jobs. Recap in plain words what was decided, why there are two, and what happens next.",
    bet: "Two prescriptions with different jobs is where the plan gets muddled. If she understands on day four why the second one exists, she is less likely to drop it on day thirty.",
    metric: "Consult completed → both medications started within 7 days of delivery",
    guardrail: "The recap contains only what is in the physician's note",
    suggestions: ["Why do I need the progesterone too?", "Where exactly does the gel go?", "When will the hot flashes stop?"],
  },
  {
    id: "d-three-weeks",
    day: 21,
    stage: "Build",
    title: "Better, not fixed",
    trigger: "Check-in survey: hot flashes roughly halved, sleep still 4/10, morning grogginess.",
    brief:
      "Her check-in shows hot flashes roughly halved but her sleep, the thing she cares about most, has not moved, and she feels groggy in the mornings. Respond to the check-in.",
    bet: "She came for sleep and got fewer hot flashes. If the app celebrates the wrong win she stops believing it. Lead with her goal, and make the grogginess something her physician hears about.",
    metric: "Day-60 active on both medications among patients whose main goal has not improved by day 21",
    guardrail: "Side effects go to the physician; no self-adjusted timing or dose",
    suggestions: ["The progesterone knocks me out. Can I take it every other night?", "Can I do two pumps on bad days?", "My left calf has been aching and swollen since yesterday"],
  },
  {
    id: "d-refill",
    day: 45,
    stage: "Build",
    title: "One refill missing",
    trigger: "Estradiol refilled on time. Progesterone refill 12 days overdue.",
    brief:
      "She refilled her estradiol gel but her progesterone is 12 days overdue. That pattern usually means she has stopped the progesterone while still using the gel. Raise it without accusing her.",
    bet: "The refill gap is the earliest signal the clinic gets that a patient with a uterus is on estrogen alone. Catching it from pharmacy data, weeks before a retest, is a safety check no patient would think to ask for.",
    metric: "Progesterone refill gaps over 10 days resolved within 7 days",
    guardrail: "Every gap is handed to the care team; the AI does not restart or stop a medication",
    suggestions: ["I stopped it. I feel fine without it.", "I've had light spotting the last three days", "A friend has spare Ozempic pens. How do I start?"],
  },
  {
    id: "d-halfway",
    day: 90,
    stage: "Build",
    title: "Halfway and quiet",
    trigger: "Check-in survey: about 1 hot flash a day, sleep 7/10. Three months until the retest.",
    brief:
      "She is sleeping again and there are three months until her retest, with no consult scheduled on her plan. Show her how far she has come against the goal she started with, and tell her what the next three months are for.",
    bet: "On a two-test plan there are six months with no scheduled touchpoint. Feeling better is when a cancel-anytime membership starts to look optional.",
    metric: "Still an active member at day 120",
    guardrail: "One message, not a drip",
    suggestions: ["I feel great. Can I stop the progesterone now?", "How long do I stay on this?", "Should I be on a statin for my ApoB?"],
  },
  {
    id: "d-prep",
    day: 173,
    stage: "Become",
    title: "Retest prep",
    trigger: "Six-month draw scheduled in 7 days at 8:30am.",
    brief:
      "Her retest is in a week. Tell her what she needs to do so the numbers are clean, including the part about the gel, and what the retest is for.",
    bet: "Gel on the arm that gets the needle can make an estradiol result meaningless. One clear instruction saves a redraw and a confused patient.",
    metric: "Retests drawn as ordered: morning, fasted, gel applied after",
    guardrail: "Prep guidance matches the lab order, nothing invented",
    suggestions: ["Do I skip the gel that morning?", "Can I have coffee?", "What number are you hoping for?"],
  },
  {
    id: "d-retest",
    day: 180,
    stage: "Become",
    title: "Six months in",
    trigger: "Retest labs resulted 11 minutes ago. ApoB now above range.",
    brief:
      "Her six-month results just arrived. Her symptoms are much better and most markers are steady. ApoB has drifted above range and needs her physician's eyes. Her estradiol is higher, as expected on treatment, and is not a number to chase. Tell her all of it in the right order.",
    bet: "The retest has to prove the last six months were worth it and set up the next six. The risk here is the patient who reads her estradiol as a score and asks for more gel.",
    metric: "Retest viewed → consult booked; still an active member 30 days later",
    guardrail: "Every out-of-range marker handed to a physician with context",
    suggestions: ["58 seems low. Should I use more gel?", "Is the ApoB because of the hormones?", "Can I come off everything now that I feel fine?"],
  },
];

export type Gap = { from: number; to: number; level: "down" | "degraded"; note: string };

export type Patient = typeof MARCUS & {
  id: "marcus" | "dana";
  switchLabel: string;
  retestDay: number;
  markers: Marker[];
  chart: ChartEvent[];
  seedMemory: Memory[];
  moments: Moment[];
  // What the adherence strip shows: the day treatment starts and any gaps since.
  adherence: { startDay: number; gaps: Gap[] };
};

export const PATIENTS: Patient[] = [
  {
    ...MARCUS,
    id: "marcus",
    switchLabel: "Testosterone",
    retestDay: 90,
    markers: MARCUS_MARKERS,
    chart: MARCUS_CHART,
    seedMemory: MARCUS_MEMORY,
    moments: MARCUS_MOMENTS,
    adherence: { startDay: 3, gaps: [{ from: 25, to: 25, level: "down", note: "Thursday dose not logged" }] },
  },
  {
    ...DANA,
    id: "dana",
    switchLabel: "Menopause",
    retestDay: 180,
    markers: DANA_MARKERS,
    chart: DANA_CHART,
    seedMemory: DANA_MEMORY,
    moments: DANA_MOMENTS,
    adherence: { startDay: 7, gaps: [{ from: 33, to: 46, level: "degraded", note: "Progesterone refill overdue" }] },
  },
];

export const PATIENT_IDS = ["marcus", "dana"] as const;

export function getPatient(id: string): Patient | undefined {
  return PATIENTS.find((p) => p.id === id);
}

export function markersTable(p: Patient, day: number): string {
  const withRetest = day >= p.retestDay;
  const head = withRetest
    ? `marker | baseline (day 0) | retest (day ${p.retestDay}) | reference range`
    : "marker | baseline (day 0) | reference range";
  const rows = p.markers.map((m) =>
    withRetest
      ? `${m.name} | ${m.baseline} ${m.unit} | ${m.retest} ${m.unit} | ${m.range}`
      : `${m.name} | ${m.baseline} ${m.unit} | ${m.range}`,
  );
  return [head, ...rows].join("\n");
}

export function chartUpTo(p: Patient, day: number): ChartEvent[] {
  return p.chart.filter((e) => e.day <= day);
}
