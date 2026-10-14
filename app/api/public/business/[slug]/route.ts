import { NextResponse } from "next/server";
import { getPublicBusiness } from "@/lib/public-data";
import { slugSchema } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const slug = slugSchema.safeParse(params.slug);
  if (!slug.success) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const data = await getPublicBusiness(slug.data);
    if (!data) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[public/business]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
