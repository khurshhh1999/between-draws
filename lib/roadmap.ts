// How the moments would be sequenced and measured. Every baseline here is an assumption, not Hone data.
import { PATIENTS, type Moment, type Patient } from "./patient";

export type Level = "Low" | "Medium" | "High";
export type Phase = "Now" | "Next" | "Later";

type Measure = { baseline: string; target: string; events: string[] };

type Entry = {
  patient: Patient["id"];
  moment: string;
  reach: Level;
  impact: Level;
  effort: Level;
  risk: Level;
  why: string;
  measure?: Measure;
};

export type Item = Omit<Entry, "patient" | "moment"> & { first: string; moment: Moment };

const PLAN: { phase: Phase; note: string; items: Entry[] }[] = [
  {
    phase: "Now",
    note: "Weeks 1 to 8. Needs only data Hone already has, and every reply can be checked against a document.",
    items: [
      {
        patient: "marcus",
        moment: "results",
        reach: "High",
        impact: "High",
        effort: "Low",
        risk: "Low",
        why: "Every new patient passes through it, the inputs are the lab result and booking status, and the one guardrail (no diagnosis before review) is easy to audit.",
        measure: { baseline: "55%", target: "62%", events: ["results_viewed", "results_message_opened", "consult_booked"] },
      },
      {
        patient: "dana",
        moment: "d-results",
        reach: "Medium",
        impact: "High",
        effort: "Low",
        risk: "Low",
        why: "Same pipeline as Marcus with different copy. Normal-looking labs and bad symptoms is where I would expect menopause patients to decide the service is not for them.",
        measure: { baseline: "50%", target: "57%", events: ["results_viewed", "results_message_opened", "consult_booked"] },
      },
      {
        patient: "marcus",
        moment: "consult",
        reach: "High",
        impact: "Medium",
        effort: "Low",
        risk: "Low",
        why: "The physician note is already written. The recap only restates it, so a clinician can check it line by line.",
        measure: { baseline: "75%", target: "80%", events: ["consult_completed", "recap_viewed", "protocol_accepted", "shipment_sent"] },
      },
      {
        patient: "dana",
        moment: "d-consult",
        reach: "Medium",
        impact: "High",
        effort: "Low",
        risk: "Low",
        why: "Explaining why progesterone exists on day 4 is the cheapest defence against her dropping it on day 30.",
        measure: { baseline: "70%", target: "77%", events: ["consult_completed", "recap_viewed", "shipment_delivered", "first_dose_logged"] },
      },
      {
        patient: "marcus",
        moment: "prep",
        reach: "High",
        impact: "Medium",
        effort: "Low",
        risk: "Low",
        why: "The lab order already holds every instruction. A draw on the wrong day wastes a quarter of his plan.",
        measure: { baseline: "80%", target: "87%", events: ["prep_message_viewed", "lab_draw_completed", "lab_draw_flagged"] },
      },
      {
        patient: "dana",
        moment: "d-prep",
        reach: "Medium",
        impact: "Medium",
        effort: "Low",
        risk: "Low",
        why: "One instruction (gel after the draw, other arm) saves a redraw. Ranked below Marcus only because six-month retests come round half as often.",
        measure: { baseline: "75%", target: "83%", events: ["prep_message_viewed", "lab_draw_completed", "redraw_ordered"] },
      },
    ],
  },
  {
    phase: "Next",
    note: "Weeks 6 to 16. The retention and safety moments. Each needs a new trigger and a handoff path the care team has agreed to.",
    items: [
      {
        patient: "marcus",
        moment: "dip",
        reach: "High",
        impact: "High",
        effort: "Medium",
        risk: "Medium",
        why: "My best guess at the biggest single churn point. It needs the check-in survey wired as a trigger, and it is where patients ask to raise their own dose.",
        measure: { baseline: "78%", target: "84%", events: ["checkin_submitted", "dip_message_viewed", "handoff_created", "membership_cancelled"] },
      },
      {
        patient: "dana",
        moment: "d-refill",
        reach: "Low",
        impact: "High",
        effort: "Medium",
        risk: "High",
        why: "Few patients hit it, but estrogen without progesterone is the worst safety failure in her program. Needs refill data per medication, and the AI only hands off.",
        measure: { baseline: "40%", target: "52%", events: ["refill_gap_detected", "handoff_created", "refill_requested"] },
      },
      {
        patient: "marcus",
        moment: "start",
        reach: "High",
        impact: "High",
        effort: "Medium",
        risk: "Medium",
        why: "Needs a delivery event and dose logging. After the dip because technique questions need a care-team route that does not exist yet.",
        measure: { baseline: "70%", target: "77%", events: ["shipment_delivered", "first_dose_logged", "care_team_question_sent"] },
      },
      {
        patient: "marcus",
        moment: "retest",
        reach: "High",
        impact: "High",
        effort: "High",
        risk: "High",
        why: "The proof moment for the whole program, and the riskiest message. Every out-of-range marker needs a clinician queue that can absorb the volume.",
        measure: {
          baseline: "45% book, 85% active",
          target: "52% book, 88% active",
          events: ["retest_viewed", "handoff_created", "consult_booked", "membership_cancelled"],
        },
      },
      {
        patient: "dana",
        moment: "d-retest",
        reach: "Medium",
        impact: "High",
        effort: "Medium",
        risk: "High",
        why: "Reuses the second-draw handoff path. The new risk is a patient reading her estradiol as a score and asking for more gel.",
        measure: {
          baseline: "40% book, 85% active",
          target: "47% book, 88% active",
          events: ["retest_viewed", "handoff_created", "consult_booked", "membership_cancelled"],
        },
      },
      {
        patient: "dana",
        moment: "d-three-weeks",
        reach: "Medium",
        impact: "Medium",
        effort: "Medium",
        risk: "High",
        why: "The same pattern as the day-12 dip, so it waits until the dip shows it works. Side-effect reports here include clot symptoms, so the handoff has to be right first.",
        measure: { baseline: "65%", target: "72%", events: ["checkin_submitted", "side_effect_handoff_created", "refill_requested"] },
      },
    ],
  },
  {
    phase: "Later",
    note: "Quarter two onward. Each needs a new data pipeline or clinical sign-off before it can ship.",
    items: [
      {
        patient: "marcus",
        moment: "missed",
        reach: "Medium",
        impact: "Medium",
        effort: "Medium",
        risk: "High",
        why: "Blocked on a physician-approved missed-dose script. The red team showed the model improvising here, so it should not ship until it can quote the clinic's wording.",
      },
      {
        patient: "marcus",
        moment: "quiet",
        reach: "Medium",
        impact: "Medium",
        effort: "High",
        risk: "Low",
        why: "Needs app activity joined to dose logs, plus opt-out handling. Worth it, but only once the earlier moments have proved patients read these messages.",
      },
      {
        patient: "dana",
        moment: "d-halfway",
        reach: "Medium",
        impact: "Medium",
        effort: "High",
        risk: "Low",
        why: "Same inactivity pipeline as the quiet stretch. I would build that pipeline once and copy whatever the quiet stretch teaches.",
      },
    ],
  },
];

// Look moments up by id so titles, metrics and guardrails stay in step with lib/patient.ts.
function resolve(e: Entry): Item {
  const patient = PATIENTS.find((p) => p.id === e.patient);
  const moment = patient?.moments.find((m) => m.id === e.moment);
  if (!patient || !moment) throw new Error(`Roadmap refers to a missing moment: ${e.patient}/${e.moment}`);
  const { reach, impact, effort, risk, why, measure } = e;
  return { reach, impact, effort, risk, why, measure, first: patient.first, moment };
}

export const ROADMAP = PLAN.map((g) => ({ ...g, items: g.items.map(resolve) }));

export const MOMENT_COUNT = PATIENTS.reduce((n, p) => n + p.moments.length, 0);

// Two-sided two-proportion test, normal approximation, equal arms.
export function sampleSizePerArm(p1: number, p2: number, zAlpha = 1.96, zBeta = 0.8416): number {
  const pbar = (p1 + p2) / 2;
  const a = zAlpha * Math.sqrt(2 * pbar * (1 - pbar));
  const b = zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil((a + b) ** 2 / (p2 - p1) ** 2);
}

export const TEST = {
  baseline: 0.8,
  lift: 0.04,
  alpha: 0.05,
  power: 0.8,
  zAlpha: 1.96,
  zBeta: 0.8416,
  fallbackLift: 0.06,
};

export const PER_ARM = sampleSizePerArm(TEST.baseline, TEST.baseline + TEST.lift, TEST.zAlpha, TEST.zBeta);
export const PER_ARM_FALLBACK = sampleSizePerArm(TEST.baseline, TEST.baseline + TEST.fallbackLift, TEST.zAlpha, TEST.zBeta);
