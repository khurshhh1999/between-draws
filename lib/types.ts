import type { ToolCall, TurnEvent, Verdict } from "./claude";

// `sig` is the server's signature over a finished reply; it is sent back with the thread.
export type Msg = { role: "user" | "assistant"; text: string; insight?: boolean; calls?: ToolCall[]; error?: string; sig?: string };
export type Meta = Extract<TurnEvent, { t: "meta" }>;
export type EvalResult = { status: "running" | "done" | "error"; reply?: string; calls?: ToolCall[]; verdict?: Verdict; message?: string };
export type Run = { off: string[]; pass: number; total: number };
export type PanelTab = "hood" | "contract" | "redteam" | "pm";

export const URGENCY = { routine: "Routine", same_day: "Same day", emergency: "Emergency" } as const;
