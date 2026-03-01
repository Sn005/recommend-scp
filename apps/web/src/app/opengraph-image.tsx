import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const alt = "SCPicks - あなた好みのSCPを発見";

export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div
          style={{
            fontSize: "80px",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-2px",
          }}
        >
          SCPicks
        </div>
        <div
          style={{
            fontSize: "32px",
            fontWeight: 400,
            color: "#FFFFFF",
            opacity: 0.9,
          }}
        >
          あなた好みのSCPを発見
        </div>
      </div>
    </div>,
    { ...size }
  );
}
