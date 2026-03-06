import { describe, it, expect } from "vitest";
import { extractOfflineAssistantClientSlots, mergeOfflineAssistantClientSlots } from "../offline-assistant-slots";

describe("Offline assistant client slots", () => {
  it("should extract purpose (COMPRA)", () => {
    const slots = extractOfflineAssistantClientSlots("Quero comprar um apartamento");
    expect(slots.purpose).toBe("COMPRA");
  });

  it("should extract purpose (LOCACAO)", () => {
    const slots = extractOfflineAssistantClientSlots("Estou procurando para alugar");
    expect(slots.purpose).toBe("LOCACAO");
  });

  it("should extract pets yes/no", () => {
    const yes = extractOfflineAssistantClientSlots("Tenho um cachorro");
    const no = extractOfflineAssistantClientSlots("Não tenho pets");
    expect(yes.hasPets).toBe(true);
    expect(no.hasPets).toBe(false);
  });

  it("should extract bedrooms and parking", () => {
    const slots = extractOfflineAssistantClientSlots("Preciso de 3 quartos e 2 vagas");
    expect(slots.bedroomsNeeded).toBe(3);
    expect(slots.parkingSpotsNeeded).toBe(2);
  });

  it("should extract budget", () => {
    const slots = extractOfflineAssistantClientSlots("Orçamento até R$ 450 mil");
    expect(slots.budget).toContain("r$");
  });

  it("should merge slots preferring new values", () => {
    const prev = extractOfflineAssistantClientSlots("Quero comprar e preciso de 2 quartos");
    const next = extractOfflineAssistantClientSlots("Na verdade vou alugar e preciso de 3 quartos");
    const merged = mergeOfflineAssistantClientSlots(prev, next);
    expect(merged?.purpose).toBe("LOCACAO");
    expect(merged?.bedroomsNeeded).toBe(3);
  });
});
