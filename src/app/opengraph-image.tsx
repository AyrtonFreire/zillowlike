import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "OggaHub";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)",
          padding: 72,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "rgba(2, 6, 23, 0.55)",
            borderRadius: 48,
            border: "1px solid rgba(255,255,255,0.18)",
            padding: 72,
            boxShadow: "0 30px 100px rgba(0, 0, 0, 0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%)",
                color: "#ffffff",
                fontSize: 52,
                fontWeight: 800,
                boxShadow: "0 0 0 2px rgba(255,255,255,0.18)",
              }}
            >
              O
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: 64,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                OggaHub
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: 1.25,
                }}
              >
                Seu hub imobiliário para comprar, alugar e anunciar
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              color: "rgba(255,255,255,0.88)",
              fontSize: 24,
            }}
          >
            <div style={{ display: "flex", gap: 18 }}>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                Comprar
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                Alugar
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                Anunciar
              </div>
            </div>

            <div style={{ opacity: 0.82 }}>oggahub.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
