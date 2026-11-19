import type { TurnEvent } from "./claude";

// POST a turn and hand each newline-delimited event to the caller as it arrives.
export async function streamTurn(url: string, body: unknown, onEvent: (e: TurnEvent) => void, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const message = res.status === 429 ? "Too many requests. Try again in a few minutes." : `Request failed (${res.status}).`;
    onEvent({ t: "error", code: "api", message });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (line: string) => {
    if (!line.trim()) return;
    try {
      onEvent(JSON.parse(line) as TurnEvent);
    } catch {
      // A malformed line is dropped rather than failing the whole turn.
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(flush);
  }
  flush(buffer + decoder.decode());
}
