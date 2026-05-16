import { describe, expect, it } from "vitest";
import {
  countSentences,
  detectWordRepetition,
  scoreBio,
  validateBio,
  validateHeadline,
} from "../validators";

describe("validateHeadline", () => {
  it("blocks empty headline", () => {
    expect(validateHeadline("").level).toBe("block");
  });

  it("blocks short headlines", () => {
    expect(validateHeadline("oi").level).toBe("block");
  });

  it('blocks generic word "tudo"', () => {
    const r = validateHeadline("Especialista em tudo");
    expect(r.level).toBe("block");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('blocks regex "especialista em geral"', () => {
    expect(validateHeadline("Sou especialista em geral.").level).toBe("block");
  });

  it("accepts a concrete headline", () => {
    expect(validateHeadline("Apartamentos compactos em Boa Viagem").level).toBe("ok");
  });

  it("warns on overly long headlines", () => {
    const long = "Atendimento residencial e comercial premium ".repeat(5);
    expect(validateHeadline(long).level).toBe("warn");
  });
});

describe("validateBio", () => {
  it("blocks empty bio", () => {
    expect(validateBio("").level).toBe("block");
  });

  it("blocks under 80 chars", () => {
    expect(validateBio("Sou corretor.").level).toBe("block");
  });

  it("warns on single-sentence long bio", () => {
    const text =
      "Atuo há dez anos no mercado de imóveis em Petrolina e atendo clientes interessados em imóveis residenciais na cidade toda dia útil";
    expect(validateBio(text).level).toBe("warn");
  });

  it("accepts a well-formed bio", () => {
    const text =
      "Sou corretor em Petrolina há 7 anos. Atendo clientes que buscam apartamentos compactos no Centro e Cidade Universitária. Meu foco é negociação clara, com retorno em até 24 horas.";
    expect(validateBio(text).level).toBe("ok");
  });

  it("warns on heavy repetition", () => {
    const text =
      "Imóveis imóveis imóveis imóveis residenciais em Petrolina e Juazeiro com excelência de atendimento individual.";
    expect(validateBio(text).level).toBe("warn");
  });
});

describe("countSentences", () => {
  it("counts sentences ending in . ! ?", () => {
    expect(countSentences("Olá. Tudo bem? Sim!")).toBe(3);
  });

  it("returns 0 on empty", () => {
    expect(countSentences("")).toBe(0);
  });

  it("treats unterminated text as 1 sentence", () => {
    expect(countSentences("apenas uma sentenca")).toBe(1);
  });
});

describe("detectWordRepetition", () => {
  it("returns null when no repetition", () => {
    expect(detectWordRepetition("um dois tres quatro cinco seis")).toBeNull();
  });

  it("detects 4+ repetition of a word", () => {
    const result = detectWordRepetition("casa casa casa casa apartamento");
    expect(result).toEqual({ word: "casa", count: 4 });
  });
});

describe("scoreBio", () => {
  it("returns 0 on empty", () => {
    expect(scoreBio("")).toBe(0);
  });

  it("returns higher score for richer bios", () => {
    const weak = "Sou corretor há um tempo.";
    const strong =
      "Sou corretor em Petrolina há 8 anos. Atendo clientes que buscam apartamentos compactos no Centro e Cidade Universitária. Meu foco é negociação transparente com retorno em até 24 horas e visitas guiadas.";
    expect(scoreBio(strong)).toBeGreaterThan(scoreBio(weak));
    expect(scoreBio(strong)).toBeGreaterThanOrEqual(70);
  });
});
