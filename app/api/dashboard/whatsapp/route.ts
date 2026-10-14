import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase-server";
import { formatDateBR } from "@/lib/format";

const bodySchema = z.object({
  appointmentId: z.string().uuid(),
  type: z.literal("confirmation").default("confirmation"),
});

interface ApptRow {
  id: string;
  business_id: string;
  date: string;
  start_time: string;
  client: { name: string; whatsapp: string } | null;
  service: { name: string } | null;
  business: { name: string } | null;
}

export async function POST(req: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  try {
    // RLS: se o agendamento não for de um negócio do dono logado, volta vazio.
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, business_id, date, start_time, client:clients(name, whatsapp), service:services(name), business:businesses(name)",
      )
      .eq("id", parsed.data.appointmentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const appt = data as unknown as ApptRow;
    const message =
      `Olá ${appt.client?.name ?? ""}! Seu horário na ${appt.business?.name ?? ""} está confirmado ` +
      `para ${formatDateBR(appt.date).slice(0, 5)} às ${appt.start_time.slice(0, 5)} - ` +
      `Serviço: ${appt.service?.name ?? ""}. Responda SIM para confirmar.`;

    // TODO: integrar Evolution API aqui para disparar de fato. Por ora só registra.
    console.log("[whatsapp:stub]", { appointmentId: appt.id, message });

    const { error: insErr } = await supabase.from("campaigns").insert({
      business_id: appt.business_id,
      type: "confirmation",
      message,
      sent_at: null,
    });
    if (insErr) throw insErr;

    return NextResponse.json({ success: true, message });
  } catch (e) {
    console.error("[dashboard/whatsapp]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
