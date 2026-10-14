import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { PublicBusiness, PublicService } from "@/lib/types";
import { MAX_DAYS_AHEAD, todayIn } from "@/lib/slots-core";
import { addDays, format, parseISO } from "date-fns";

const BUSINESS_FIELDS =
  "id, name, slug, logo_url, whatsapp, open_time, close_time, slot_minutes, timezone";

/** Negócio + serviços ativos, somente com campos permitidos publicamente. */
export async function getPublicBusiness(
  slug: string,
): Promise<{
  business: PublicBusiness;
  services: PublicService[];
  today: string;
  maxDate: string;
} | null> {
  const db = getSupabaseAdmin();
  const { data: business, error } = await db
    .from("businesses")
    .select(BUSINESS_FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!business) return null;

  const { data: services, error: sErr } = await db
    .from("services")
    .select("id, name, duration_minutes, price")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("price", { ascending: true });
  if (sErr) throw sErr;

  // timezone é usado só para calcular hoje/limite; não é exposto.
  const { timezone, ...publicFields } = business as PublicBusiness & { timezone: string };
  const today = todayIn(timezone, new Date());
  const maxDate = format(addDays(parseISO(today), MAX_DAYS_AHEAD), "yyyy-MM-dd");

  return {
    today,
    maxDate,
    business: publicFields as PublicBusiness,
    services: (services ?? []).map((s) => ({ ...s, price: Number(s.price) })) as PublicService[],
  };
}
