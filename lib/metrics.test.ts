import { describe, expect, it } from "vitest";
import { computeDayMetrics } from "./metrics";

const biz = { open_time: "08:00", close_time: "19:00", slot_minutes: 30, days_off: [0] };

describe("computeDayMetrics", () => {
  it("dia sem agendamentos: tudo vago", () => {
    const m = computeDayMetrics(biz, "2026-10-09", [], [{ duration_minutes: 30, price: 40 }]);
    expect(m.totalSlots).toBe(22);
    expect(m.vacantSlots).toBe(22);
    expect(m.lostMoney).toBe(880);
  });

  it("serviço de 60min ocupa 2 slots; cancelado não conta", () => {
    const m = computeDayMetrics(
      biz,
      "2026-10-09",
      [
        { start_time: "10:00:00", end_time: "11:00:00", status: "confirmed" },
        { start_time: "14:00:00", end_time: "14:30:00", status: "cancelled" },
      ],
      [{ duration_minutes: 30, price: 40 }],
    );
    expect(m.occupiedSlots).toBe(2);
    expect(m.vacantSlots).toBe(20);
    expect(m.occupancyRate).toBeCloseTo(2 / 22);
  });

  it("domingo (folga): zero slots", () => {
    const m = computeDayMetrics(biz, "2026-10-11", [], [{ duration_minutes: 30, price: 40 }]);
    expect(m.totalSlots).toBe(0);
    expect(m.lostMoney).toBe(0);
  });
});
