import type { Marker } from "./patient";

function bounds(m: Marker): [number, number] | null {
  const nums = m.range.match(/[\d.]+/g)?.map(Number) ?? [];
  // "Under X" has no lower bound; draw the gauge over the top 40% so nearby values are readable.
  if (m.range.startsWith("under") && nums.length === 1) return [nums[0] * 0.6, nums[0]];
  return nums.length === 2 ? [nums[0], nums[1]] : null;
}

// Markers without a numeric range (dosed to symptoms) are never flagged.
export function outOfRange(m: Marker, value: number): boolean {
  const b = bounds(m);
  if (!b) return false;
  return m.range.startsWith("under") ? value >= b[1] : value < b[0] || value > b[1];
}

// Where a value sits in its reference range, drawn as a nine-dot gauge.
export function gauge(m: Marker, value: number): string {
  const b = bounds(m);
  if (!b) return "no target";
  const [lo, hi] = b;
  const slot = Math.round(((value - lo) / (hi - lo)) * 8);
  if (slot < 0) return m.range.startsWith("under") ? "[●········]" : "●[·········]";
  if (slot > 8 || outOfRange(m, value)) return "[·········]●";
  return `[${"·".repeat(slot)}●${"·".repeat(8 - slot)}]`;
}
