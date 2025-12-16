import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest, context: { params: Promise<{ cep: string }> }) {
  try {
    const { cep } = await context.params;
    const digits = String(cep || "").replace(/\D+/g, "");

    if (digits.length !== 8) {
      return NextResponse.json({ error: "Invalid CEP" }, { status: 400 });
    }

    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json({ error: "ViaCEP request failed" }, { status: 502 });
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
