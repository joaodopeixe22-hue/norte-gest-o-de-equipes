import { describe, expect, it } from "vitest";
import { expectedDays, periodRange, startOfWeek, greeting } from "./dates";

describe("regras de período", () => {
  it("dias esperados descontam domingos (semana seg–dom = 6)", () => {
    expect(expectedDays("2026-11-16", "2026-11-22")).toBe(6);
  });
  it("mês de novembro/2026 tem 25 dias esperados (30 − 5 domingos)", () => {
    expect(expectedDays("2026-11-01", "2026-11-30")).toBe(25);
  });
  it("semana começa na segunda-feira", () => {
    expect(startOfWeek("2026-11-22")).toBe("2026-11-16");
  });
  it("comparação semanal usa o mesmo trecho da semana anterior", () => {
    const r = periodRange("semana", "2026-11-18");
    expect(r).toEqual({ start: "2026-11-16", end: "2026-11-22", prevStart: "2026-11-09", prevEnd: "2026-11-11" });
  });
  it("saudação por horário", () => {
    expect(greeting(8)).toBe("Bom dia");
    expect(greeting(14)).toBe("Boa tarde");
    expect(greeting(20)).toBe("Boa noite");
  });
});
