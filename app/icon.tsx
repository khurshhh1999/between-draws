import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// The selected stop on the timeline: a yellow dot with an ink ring.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f6f4", borderRadius: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 38, background: "#f2ff00", border: "5px solid #0d0c0c" }} />
      </div>
    ),
    size,
  );
}
