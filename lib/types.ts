export type AppointmentStatus = "confirmed" | "cancelled" | "done" | "no_show";
export type CampaignType =
  | "reengagement"
  | "birthday"
  | "promo"
  | "reminder"
  | "confirmation";

export interface Business {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  owner_name: string | null;
  whatsapp: string;
  logo_url: string | null;
  timezone: string;
  open_time: string; // "HH:mm:ss"
  close_time: string;
  slot_minutes: number;
  days_off: number[]; // 0 = domingo ... 6 = sábado
  created_at: string;
}

/** Campos que podem ser expostos publicamente (sem owner_id / owner_name). */
export type PublicBusiness = Pick<
  Business,
  | "id"
  | "name"
  | "slug"
  | "logo_url"
  | "whatsapp"
  | "open_time"
  | "close_time"
  | "slot_minutes"
>;

export interface Service {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
}

export type PublicService = Pick<
  Service,
  "id" | "name" | "duration_minutes" | "price"
>;

export interface Client {
  id: string;
  business_id: string;
  name: string;
  whatsapp: string;
  last_visit: string | null;
  consent_at: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  client_id: string;
  service_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // "HH:mm:ss"
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface Campaign {
  id: string;
  business_id: string;
  type: CampaignType;
  message: string;
  sent_at: string | null;
  created_at: string;
}
