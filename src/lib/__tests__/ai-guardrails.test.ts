import { describe, it, expect } from "vitest";
import { applyOfflineAutoReplyGuardrails } from "../ai-guardrails";

describe("AI Guardrails", () => {
  it("should enforce a positive opening when draft starts with denial", () => {
    const out = applyOfflineAutoReplyGuardrails({
      draft: "Não posso ajudar com isso agora.",
      clientName: "João",
      propertyTitle: "Apartamento Central",
    });

    expect(out.toLowerCase()).toMatch(/^entendi\./);
    expect(out).toContain("Não posso");
  });

  it("should avoid scheduling fallback when hardForbidden triggers outside scheduling context", () => {
    const out = applyOfflineAutoReplyGuardrails({
      draft: "Vou confirmar isso para você.",
      clientName: "João",
      propertyTitle: "Apartamento Central",
    });

    expect(out).toContain("posso registrar sua solicitação");
    expect(out).not.toContain("pedido de visita");
  });

  it("should use scheduling-safe fallback when hardForbidden triggers with scheduling context", () => {
    const out = applyOfflineAutoReplyGuardrails({
      draft: "Visita confirmada para amanhã às 10h.",
      clientName: "João",
      propertyTitle: "Apartamento Central",
    });

    expect(out).toContain("pedido de visita");
    expect(out.toLowerCase()).not.toContain("visita confirmada");
  });
});
