import { ImageResponse } from "next/og";

export const runtime = "edge";

export const revalidate = 86400;

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%)",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          O
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
