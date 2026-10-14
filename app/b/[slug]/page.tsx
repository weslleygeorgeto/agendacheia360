import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingClient from "@/components/BookingClient";
import { getPublicBusiness } from "@/lib/public-data";
import { waLink } from "@/lib/format";
import { slugSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return getPublicBusiness(parsed.data);
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await load(params.slug).catch(() => null);
  return {
    title: data ? `Agendar - ${data.business.name}` : "Agendamento",
    robots: { index: false },
  };
}

export default async function BusinessPage({ params }: { params: { slug: string } }) {
  const data = await load(params.slug);
  if (!data) notFound();
  const { business, services, today, maxDate } = data;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="h-12 w-12 rounded-full border border-neutral-200 object-cover" />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-full bg-foreground text-sm font-bold text-background">
              {business.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight">{business.name}</h1>
        </div>
        <a href={waLink(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          WhatsApp
        </a>
      </header>

      <BookingClient business={business} services={services} today={today} maxDate={maxDate} />
    </main>
  );
}
