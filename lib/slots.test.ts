import { describe, expect, it } from "vitest";
import {
  computeAvailableSlots,
  filterFree,
  generateSlots,
  isWithinBookingWindow,
  weekdayOf,
  type BusinessSchedule,
} from "./slots-core";

const biz: BusinessSchedule = {
  open_time: "08:00:00",
  close_time: "19:00:00",
  slot_minutes: 30,
  days_off: [0],
  timezone: "America/Sao_Paulo",
};

// 2026-10-09 (sexta) 10:00 em São Paulo = 13:00 UTC
const NOW = new Date("2026-10-09T13:00:00Z");

describe("generateSlots", () => {
  it("serviço de 30min gera 22 slots (08:00 a 18:30)", () => {
    const s = generateSlots(biz, 30);
    expect(s).toHaveLength(22);
    expect(s[0]).toBe("08:00");
    expect(s[s.length - 1]).toBe("18:30");
  });

  it("serviço de 60min não deixa começar depois das 18:00", () => {
    const s = generateSlots(biz, 60);
    expect(s[s.length - 1]).toBe("18:00");
    expect(s).not.toContain("18:30");
  });

  it("serviço maior que o expediente não gera slots", () => {
    expect(generateSlots(biz, 12 * 60)).toEqual([]);
  });
});

describe("filterFree (overlap)", () => {
  const busy = [{ start: 10 * 60, end: 10 * 60 + 30 }]; // 10:00-10:30

  it("serviço de 30min bloqueia só 10:00", () => {
    const free = filterFree(generateSlots(biz, 30), 30, busy);
    expect(free).not.toContain("10:00");
    expect(free).toContain("09:30");
    expect(free).toContain("10:30");
  });

  it("serviço de 60min bloqueia 09:30 e 10:00 (não cabe)", () => {
    const free = filterFree(generateSlots(biz, 60), 60, busy);
    expect(free).not.toContain("09:30");
    expect(free).not.toContain("10:00");
    expect(free).toContain("09:00");
    expect(free).toContain("10:30");
  });

  it("intervalos adjacentes não conflitam", () => {
    const free = filterFree(["10:30"], 30, busy);
    expect(free).toEqual(["10:30"]);
  });
});

describe("computeAvailableSlots", () => {
  it("domingo (dia de folga) retorna vazio", () => {
    expect(weekdayOf("2026-10-11")).toBe(0);
    expect(
      computeAvailableSlots({ business: biz, date: "2026-10-11", duration: 30, busy: [], now: NOW }),
    ).toEqual([]);
  });

  it("hoje remove horários passados com folga de 15min", () => {
    const s = computeAvailableSlots({ business: biz, date: "2026-10-09", duration: 30, busy: [], now: NOW });
    expect(s[0]).toBe("10:30"); // agora 10:00 + 15min => primeiro slot >= 10:15
    expect(s).not.toContain("10:00");
  });

  it("dia futuro devolve a grade completa", () => {
    const s = computeAvailableSlots({ business: biz, date: "2026-10-10", duration: 30, busy: [], now: NOW });
    expect(s).toHaveLength(22);
  });

  it("fim do expediente: 60min termina às 19:00", () => {
    const s = computeAvailableSlots({ business: biz, date: "2026-10-10", duration: 60, busy: [], now: NOW });
    expect(s[s.length - 1]).toBe("18:00");
  });

  it("data passada é rejeitada", () => {
    expect(
      computeAvailableSlots({ business: biz, date: "2026-10-08", duration: 30, busy: [], now: NOW }),
    ).toEqual([]);
  });

  it("perto da meia-noite UTC usa o fuso do negócio", () => {
    // 2026-10-10 01:00 UTC = 2026-10-09 22:00 em São Paulo (ainda é dia 09)
    const late = new Date("2026-10-10T01:00:00Z");
    expect(isWithinBookingWindow("2026-10-09", biz.timezone, late)).toBe(true);
    const s = computeAvailableSlots({ business: biz, date: "2026-10-09", duration: 30, busy: [], now: late });
    expect(s).toEqual([]); // expediente já acabou
  });
});

describe("isWithinBookingWindow", () => {
  it("aceita até 60 dias e rejeita 61", () => {
    expect(isWithinBookingWindow("2026-12-08", biz.timezone, NOW)).toBe(true);
    expect(isWithinBookingWindow("2026-12-09", biz.timezone, NOW)).toBe(false);
  });

  it("rejeita datas inválidas", () => {
    expect(isWithinBookingWindow("2026-02-31", biz.timezone, NOW)).toBe(false);
    expect(isWithinBookingWindow("abc", biz.timezone, NOW)).toBe(false);
  });
});
