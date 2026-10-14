import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAvailableSlots } from "@/lib/slots";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { slotsQuerySchema } from "@/lib/validation";

export async function GET(req: Request) {
  if (!rateLimit(`slots:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = slotsQuerySchema.safeParse({
    slug: url.searchParams.get("slug"),
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  const { slug, serviceId, date } = parsed.data;

  try {
    const db = getSupabaseAdmin();
    const { data: business } = await db
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!business) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Duração vem do banco; o serviço precisa ser deste negócio e estar ativo.
    const { data: service } = await db
      .from("services")
      .select("duration_minutes")
      .eq("id", serviceId)
      .eq("business_id", business.id)
      .eq("active", true)
      .maybeSingle();
    if (!service) return NextResponse.json({ error: "Serviço inválido" }, { status: 404 });

    const slots = await getAvailableSlots(business.id, date, service.duration_minutes);
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("[public/slots]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
