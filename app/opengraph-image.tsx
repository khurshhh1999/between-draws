import { ImageResponse } from "next/og";

export const alt = "Between Draws: a working prototype of the AI layer for the days between lab draws";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0d0c0c";
const stops = ["Results", "Consult", "First dose", "Day 12", "Missed dose", "Quiet stretch", "Retest"];

// The banner shown when the link is shared.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f7f6f4", color: INK, padding: "64px 72px" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: "#63625f" }}>BETWEEN DRAWS · AI EXPERIENCE CONCEPT</div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 86, lineHeight: 1.1, letterSpacing: -2, whiteSpace: "nowrap" }}>
            <span style={{ whiteSpace: "nowrap" }}>The days</span>
            <span style={{ background: "#f2ff00", borderRadius: 14, padding: "0 18px", marginLeft: 20, whiteSpace: "nowrap" }}>between draws</span>
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 32, lineHeight: 1.35, color: "#33312e", maxWidth: 980 }}>
            What a clinic&apos;s AI does for a patient between blood tests, and the contract that keeps it safe to ship.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {stops.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: i === stops.length - 1 ? "none" : 1 }}>
                <div style={{ width: 26, height: 26, borderRadius: 26, background: i === 3 ? "#f2ff00" : "#f7f6f4", border: `3px solid ${i <= 3 ? INK : "#c8c8c8"}` }} />
                {i < stops.length - 1 && <div style={{ flex: 1, height: 0, borderTop: "3px dashed #c8c8c8" }} />}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 22, color: "#63625f" }}>
            <span>Two synthetic patients · live model · red-team suite</span>
            <span>Khursheed Khan</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
