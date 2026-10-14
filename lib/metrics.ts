import { generateSlots, toMinutes, weekdayOf, type SlotConfig } from "@/lib/slots-core";

export interface MetricAppointment {
  start_time: string;
  end_time: string;
  status: string;
}

export interface MetricService {
  duration_minutes: number;
  price: number;
}

export interface DayMetrics {
  totalSlots: number;
  occupiedSlots: number;
  vacantSlots: number;
  occupancyRate: number; // 0..1
  lostMoney: number; // estimativa
}

/** Métricas do dia: slots ocupados = confirmados + concluídos. */
export function computeDayMetrics(
  business: SlotConfig & { days_off: number[] },
  date: string,
  appointments: MetricAppointment[],
  services: MetricService[],
): DayMetrics {
  const dayOff = business.days_off.includes(weekdayOf(date));
  const totalSlots = dayOff ? 0 : generateSlots(business, business.slot_minutes).length;

  const occupiedSlots = appointments
    .filter((a) => a.status === "confirmed" || a.status === "done")
    .reduce((sum, a) => {
      const minutes = toMinutes(a.end_time) - toMinutes(a.start_time);
      return sum + Math.ceil(minutes / business.slot_minutes);
    }, 0);

  const vacantSlots = Math.max(0, totalSlots - occupiedSlots);
  const occupancyRate = totalSlots > 0 ? Math.min(1, occupiedSlots / totalSlots) : 0;

  // Receita média por slot = soma(preços) / soma(durações) * tamanho do slot.
  const totalMinutes = services.reduce((s, x) => s + x.duration_minutes, 0);
  const totalPrice = services.reduce((s, x) => s + x.price, 0);
  const pricePerSlot = totalMinutes > 0 ? (totalPrice / totalMinutes) * business.slot_minutes : 0;

  return {
    totalSlots,
    occupiedSlots,
    vacantSlots,
    occupancyRate,
    lostMoney: Math.round(vacantSlots * pricePerSlot * 100) / 100,
  };
}
