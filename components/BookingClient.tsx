"use client";

import { useCallback, useEffect, useState } from "react";
import AgendaGrid from "@/components/AgendaGrid";
import BookingForm from "@/components/BookingForm";
import ServiceList from "@/components/ServiceList";
import { formatBRL, formatDateBR, waLink } from "@/lib/format";
import type { PublicBusiness, PublicService } from "@/lib/types";

interface Props {
  business: PublicBusiness;
  services: PublicService[];
  today: string;
  maxDate: string;
}

interface Confirmed {
  date: string;
  time: string;
  service: PublicService;
}

export default function BookingClient({ business, services, today, maxDate }: Props) {
  const [service, setService] = useState<PublicService | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const loadSlots = useCallback(
    async (signal?: AbortSignal) => {
      if (!service) return;
      setLoadingSlots(true);
      try {
        const qs = new URLSearchParams({ slug: business.slug, serviceId: service.id, date });
        const res = await fetch(`/api/public/slots?${qs}`, { signal });
        const json = (await res.json()) as { slots?: string[]; error?: string };
        setSlots(res.ok ? (json.slots ?? []) : []);
        if (!res.ok) setError(json.error ?? "Não foi possível carregar os horários.");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setSlots([]);
      } finally {
        if (!signal?.aborted) setLoadingSlots(false);
      }
    },
    [business.slug, service, date],
  );

  useEffect(() => {
    if (!service) return;
    const ctrl = new AbortController();
    setTime(null);
    setError(null);
    void loadSlots(ctrl.signal);
    return () => ctrl.abort();
  }, [service, date, loadSlots]);

  async function submit() {
    if (!service || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: business.slug,
          serviceId: service.id,
          date,
          startTime: time,
          name,
          whatsapp,
          consent,
          website: honeypot,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (res.ok) {
        setConfirmed({ date, time, service });
        return;
      }
      setError(json.error ?? "Não foi possível agendar.");
      if (res.status === 409) {
        setTime(null);
        void loadSlots();
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    const text = `Olá! Acabei de agendar ${confirmed.service.name} para ${formatDateBR(confirmed.date)} às ${confirmed.time}.`;
    return (
      <div className="card grid gap-4 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-xl text-white">✓</div>
        <h2 className="text-xl font-bold">Agendamento confirmado!</h2>
        <p className="text-neutral-700">
          {confirmed.service.name} · {formatDateBR(confirmed.date)} às {confirmed.time}
          <br />
          {formatBRL(confirmed.service.price)}
        </p>
        <p className="text-sm text-neutral-500">Você receberá a confirmação no WhatsApp.</p>
        <a href={waLink(business.whatsapp, text)} className="btn-primary" target="_blank" rel="noopener noreferrer">
          Falar com {business.name}
        </a>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <section aria-labelledby="h-service" className="grid gap-3">
        <h2 id="h-service" className="text-lg font-semibold">1. Escolha o serviço</h2>
        <ServiceList services={services} selectedId={service?.id ?? null} onSelect={setService} />
      </section>

      {service && (
        <section aria-labelledby="h-date" className="grid gap-3">
          <h2 id="h-date" className="text-lg font-semibold">2. Escolha a data e o horário</h2>
          <input
            type="date"
            className="input"
            value={date}
            min={today}
            max={maxDate}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Data"
          />
          <AgendaGrid slots={slots} loading={loadingSlots} selected={time} onSelect={setTime} />
        </section>
      )}

      {service && time && (
        <section aria-labelledby="h-form" className="grid gap-3">
          <h2 id="h-form" className="text-lg font-semibold">3. Seus dados</h2>
          <BookingForm
            businessName={business.name}
            price={service.price}
            name={name}
            whatsapp={whatsapp}
            consent={consent}
            honeypot={honeypot}
            submitting={submitting}
            error={error}
            onChange={(p) => {
              if (p.name !== undefined) setName(p.name);
              if (p.whatsapp !== undefined) setWhatsapp(p.whatsapp);
              if (p.consent !== undefined) setConsent(p.consent);
              if (p.honeypot !== undefined) setHoneypot(p.honeypot);
            }}
            onSubmit={submit}
          />
        </section>
      )}

      {error && !(service && time) && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
