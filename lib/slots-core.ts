import { addDays, format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/** Funções puras (sem banco) para facilitar teste. Toda comparação é em minutos desde 00:00. */

export interface SlotConfig {
  open_time: string; // "HH:mm" ou "HH:mm:ss"
  close_time: string;
  slot_minutes: number;
}

export interface BusinessSchedule extends SlotConfig {
  days_off: number[];
  timezone: string;
}

export interface Interval {
  start: number; // minutos
  end: number; // minutos (exclusivo)
}

export const MAX_DAYS_AHEAD = 60;
const SAME_DAY_BUFFER_MIN = 15;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function toHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Slots brutos: último início possível = close - duration. */
export function generateSlots(cfg: SlotConfig, duration: number): string[] {
  const open = toMinutes(cfg.open_time);
  const close = toMinutes(cfg.close_time);
  const step = cfg.slot_minutes;
  if (step <= 0 || duration <= 0) return [];
  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += step) slots.push(toHHmm(t));
  return slots;
}

/** Overlap de intervalos semiabertos [start, end). */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

export function filterFree(
  slots: string[],
  duration: number,
  busy: Interval[],
): string[] {
  return slots.filter((s) => {
    const start = toMinutes(s);
    const candidate = { start, end: start + duration };
    return !busy.some((b) => overlaps(candidate, b));
  });
}

/** Dia da semana (0 = domingo) de uma data de calendário YYYY-MM-DD, sem depender de fuso. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isValidDateString(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

export function todayIn(timezone: string, now: Date): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function minutesNowIn(timezone: string, now: Date): number {
  return toMinutes(formatInTimeZone(now, timezone, "HH:mm"));
}

/** Data dentro da janela [hoje, hoje + 60 dias] no fuso do negócio. */
export function isWithinBookingWindow(
  date: string,
  timezone: string,
  now: Date,
): boolean {
  if (!isValidDateString(date)) return false;
  const today = todayIn(timezone, now);
  const max = format(addDays(parseISO(today), MAX_DAYS_AHEAD), "yyyy-MM-dd");
  return date >= today && date <= max;
}

export interface ComputeInput {
  business: BusinessSchedule;
  date: string;
  duration: number;
  busy: Interval[];
  now: Date;
}

/** Lista final de horários livres para a data. */
export function computeAvailableSlots(input: ComputeInput): string[] {
  const { business, date, duration, busy, now } = input;
  if (!isWithinBookingWindow(date, business.timezone, now)) return [];
  if (business.days_off.includes(weekdayOf(date))) return [];

  let slots = filterFree(generateSlots(business, duration), duration, busy);

  if (date === todayIn(business.timezone, now)) {
    const limit = minutesNowIn(business.timezone, now) + SAME_DAY_BUFFER_MIN;
    slots = slots.filter((s) => toMinutes(s) >= limit);
  }
  return slots;
}
