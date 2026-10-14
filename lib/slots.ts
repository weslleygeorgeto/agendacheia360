import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  computeAvailableSlots,
  toMinutes,
  type BusinessSchedule,
  type Interval,
} from "@/lib/slots-core";

export { generateSlots } from "@/lib/slots-core";

export async function getBusinessSchedule(
  businessId: string,
): Promise<BusinessSchedule | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("businesses")
    .select("open_time, close_time, slot_minutes, days_off, timezone")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  return (data as BusinessSchedule | null) ?? null;
}

/** Horários livres de um dia para um serviço com a duração informada. */
export async function getAvailableSlots(
  businessId: string,
  date: string,
  duration: number,
  now: Date = new Date(),
): Promise<string[]> {
  const business = await getBusinessSchedule(businessId);
  if (!business) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("appointments")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("date", date)
    .eq("status", "confirmed");
  if (error) throw error;

  const busy: Interval[] = (data ?? []).map(
    (a: { start_time: string; end_time: string }) => ({
      start: toMinutes(a.start_time),
      end: toMinutes(a.end_time),
    }),
  );

  return computeAvailableSlots({ business, date, duration, busy, now });
}
