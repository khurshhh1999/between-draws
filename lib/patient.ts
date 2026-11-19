// Everything in this file is synthetic. No real patient, physician, or record.

export type Marker = {
  id: string;
  name: string;
  unit: string;
  range: string;
  baseline: number;
  retest: number;
};

export const PATIENT = {
  name: "Marcus Reyes",
  first: "Marcus",
  age: 44,
  program: "Testosterone + longevity",
  plan: "Premium (4 tests and 4 physician consults a year)",
  physician: "Dr. Amara Okafor",
};

export const MARKERS: Marker[] = [
  { id: "tt", name: "Total testosterone", unit: "ng/dL", range: "300–1000", baseline: 264, retest: 612 },
  { id: "ft", name: "Free testosterone", unit: "pg/mL", range: "9–30", baseline: 5.1, retest: 14.8 },
  { id: "e2", name: "Estradiol", unit: "pg/mL", range: "10–40", baseline: 22, retest: 38 },
  { id: "hct", name: "Hematocrit", unit: "%", range: "38.5–50", baseline: 46.1, retest: 51.2 },
  { id: "psa", name: "PSA", unit: "ng/mL", range: "0–4", baseline: 0.8, retest: 0.9 },
  { id: "shbg", name: "SHBG", unit: "nmol/L", range: "16–55", baseline: 38, retest: 31 },
  { id: "a1c", name: "HbA1c", unit: "%", range: "under 5.7", baseline: 5.8, retest: 5.6 },
  { id: "apob", name: "ApoB", unit: "mg/dL", range: "under 90", baseline: 112, retest: 104 },
  { id: "vitd", name: "Vitamin D (25-OH)", unit: "ng/mL", range: "30–80", baseline: 24, retest: 41 },
  { id: "tsh", name: "TSH", unit: "mIU/L", range: "0.4–4.0", baseline: 2.1, retest: 2.0 },
  { id: "crp", name: "hs-CRP", unit: "mg/L", range: "under 1.0", baseline: 2.4, retest: 1.6 },
];

export type ChartEvent = { day: number; text: string };

// The chart as an append-only log. The model only ever sees entries up to "today".
export const CHART: ChartEvent[] = [
  { day: 0, text: "Baseline labs resulted (11 markers below)." },
  { day: 0, text: "Intake: reports low energy, poor sleep, slower recovery for about a year. Family complete, no plans for more children." },
  { day: 3, text: `Video consult with ${PATIENT.physician}. Protocol started: testosterone cypionate 70 mg subcutaneous, twice weekly (Mon and Thu). Vitamin D3 5,000 IU daily.` },
  { day: 3, text: "Physician note: reviewed every baseline marker with the patient, including HbA1c, ApoB, hs-CRP and vitamin D. Recheck all markers at day 90. Hematocrit and estradiol are the two to watch on this protocol. Lipids: lifestyle first, revisit ApoB at retest." },
  { day: 5, text: "First shipment delivered. Injection training video watched." },
  { day: 12, text: "Check-in survey: energy 4/10 (baseline 4/10), sleep 5/10, mood 6/10." },
  { day: 25, text: "Injection log: Thursday dose not logged." },
  { day: 30, text: "Refill shipped. Check-in survey: energy 6/10, sleep 6/10." },
  { day: 44, text: "Check-in survey: energy 7/10, sleep 7/10. Injections logged on schedule since day 28." },
  { day: 58, text: "No app opens in 14 days. Injections still logged via reminder taps." },
  { day: 83, text: "Day-90 lab order placed. Draw scheduled for day 90, 8:10am." },
  { day: 90, text: "Retest labs resulted (retest column below)." },
];

export type Memory = {
  id: string;
  day: number;
  fact: string;
  source: string;
};

// Things the product has learned about Marcus so far. He can see and delete every one.
export const SEED_MEMORY: Memory[] = [
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

export const MOMENTS: Moment[] = [
  {
    id: "results",
    day: 0,
    stage: "Baseline",
    title: "Results land",
    trigger: "Baseline labs resulted 4 minutes ago. Consult not yet booked.",
    brief:
      "His first lab results just arrived and he has not spoken to a physician yet. Tell him what stands out and what looks fine, in the order he would care about, and make the consult the obvious next step.",
    bet: "A wall of 70 markers is where people stall. Three sentences that say what matters turns a PDF into a reason to book.",
    metric: "Results viewed → consult booked within 48h",
    guardrail: "Zero diagnostic claims before a physician has reviewed",
    suggestions: ["Is 264 bad?", "What should I ask the doctor?", "Do I have low T?"],
  },
  {
    id: "start",
    day: 5,
    stage: "Blueprint",
    title: "First injection",
    trigger: "First shipment delivered today. No injection logged yet.",
    brief:
      "His medication arrived today and the first injection is the hardest one. Help him get through it and set honest expectations for the first two weeks.",
    bet: "The first self-injection is the single biggest drop-off in the protocol. Knowing he's nervous lets the product meet him there instead of sending a generic how-to.",
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
    bet: "A bad draw (wrong time, not fasted) wastes a quarter. Prep is the cheapest quality win in the whole loop.",
    metric: "Retests drawn in-window and fasted",
    guardrail: "Prep guidance matches the lab order, nothing invented",
    suggestions: ["What time should I do my shot before the draw?", "Can I have coffee?", "What are you hoping to see?"],
  },
  {
    id: "retest",
    day: 90,
    stage: "Become",
    title: "The second draw",
    trigger: "Retest labs resulted 6 minutes ago. Hematocrit above range.",
    brief:
      "His retest results just arrived. Most of it is good news and one marker needs a physician's eyes. Tell him both, honestly, in the right order.",
    bet: "The retest is the product's proof moment and its riskiest one. Candid about the flag, clear about who decides, and he trusts the next 90 days.",
    metric: "Retest viewed → follow-up consult booked; plan renewal",
    guardrail: "Every out-of-range marker handed to a physician with context, 100%",
    suggestions: ["Is 51.2 dangerous?", "Should I donate blood to bring it down?", "So should I lower my dose?"],
  },
];

export function markersTable(day: number): string {
  const withRetest = day >= 90;
  const head = withRetest
    ? "marker | baseline (day 0) | retest (day 90) | reference range"
    : "marker | baseline (day 0) | reference range";
  const rows = MARKERS.map((m) =>
    withRetest
      ? `${m.name} | ${m.baseline} ${m.unit} | ${m.retest} ${m.unit} | ${m.range}`
      : `${m.name} | ${m.baseline} ${m.unit} | ${m.range}`,
  );
  return [head, ...rows].join("\n");
}

export function chartUpTo(day: number): ChartEvent[] {
  return CHART.filter((e) => e.day <= day);
}
