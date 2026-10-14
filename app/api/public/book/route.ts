import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAvailableSlots } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { bookSchema } from "@/lib/validation";
import { toHHmm, toMinutes, todayIn } from "@/lib/slots-core";

const MAX_FUTURE_PER_WHATSAPP = 3;

export async function POST(req: Request) {
  if (!rateLimit(`book:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  // Honeypot: robôs preenchem o campo oculto. Finge sucesso e não grava nada.
  if (
    typeof raw === "object" &&
    raw !== null &&
    typeof (raw as { website?: unknown }).website === "string" &&
    (raw as { website: string }).website.trim() !== ""
  ) {
    return NextResponse.json({ success: true });
  }

  const parsed = bookSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos. Confira os campos." }, { status: 400 });
  }
  const { slug, serviceId, date, startTime, name, whatsapp } = parsed.data;

  try {
    const db = getSupabaseAdmin();

    const { data: business } = await db
      .from("businesses")
      .select("id, timezone")
      .eq("slug", slug)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Preço e duração SEMPRE do banco.
    const { data: service } = await db
      .from("services")
      .select("id, duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", business.id)
      .eq("active", true)
      .maybeSingle();
    if (!service) return NextResponse.json({ error: "Serviço inválido" }, { status: 404 });

    const free = await getAvailableSlots(business.id, date, service.duration_minutes);
    if (!free.includes(startTime)) {
      return NextResponse.json(
        { error: "Esse horário não está mais disponível. Escolha outro." },
        { status: 409 },
      );
    }

    // Limite de agendamentos futuros por WhatsApp neste negócio.
    const { data: existing } = await db
      .from("clients")
      .select("id")
      .eq("business_id", business.id)
      .eq("whatsapp", whatsapp)
      .maybeSingle();

    if (existing) {
      const today = todayIn(business.timezone, new Date());
      const { count } = await db
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("client_id", existing.id)
        .eq("status", "confirmed")
        .gte("date", today);
      if ((count ?? 0) >= MAX_FUTURE_PER_WHATSAPP) {
        return NextResponse.json(
          { error: "Limite de agendamentos futuros atingido. Fale com o estabelecimento." },
          { status: 429 },
        );
      }
    }

    // Cria o cliente se não existir (não sobrescreve nome de cliente existente).
    let clientId = existing?.id as string | undefined;
    if (!clientId) {
      await db
        .from("clients")
        .upsert(
          { business_id: business.id, name, whatsapp, consent_at: new Date().toISOString() },
          { onConflict: "business_id,whatsapp", ignoreDuplicates: true },
        );
      const { data: created, error: cErr } = await db
        .from("clients")
        .select("id")
        .eq("business_id", business.id)
        .eq("whatsapp", whatsapp)
        .single();
      if (cErr || !created) throw cErr ?? new Error("cliente não criado");
      clientId = created.id;
    }

    const endTime = toHHmm(toMinutes(startTime) + service.duration_minutes);

    const { data: appt, error: insErr } = await db
      .from("appointments")
      .insert({
        business_id: business.id,
        client_id: clientId,
        service_id: service.id,
        date,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
      })
      .select("id")
      .single();

    if (insErr) {
      // 23P01 = exclusion_violation: alguém reservou o mesmo horário no mesmo instante.
      if (insErr.code === "23P01") {
        return NextResponse.json(
          { error: "Esse horário acabou de ser reservado. Escolha outro." },
          { status: 409 },
        );
      }
      throw insErr;
    }

    return NextResponse.json({ success: true, appointmentId: appt.id });
  } catch (e) {
    console.error("[public/book]", e);
    return NextResponse.json({ error: "Não foi possível agendar. Tente novamente." }, { status: 500 });
  }
}
