"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import MetricsBar from "@/components/MetricsBar";
import ServicesManager from "@/components/ServicesManager";
import TodayList, { type AppointmentRow } from "@/components/TodayList";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { computeDayMetrics } from "@/lib/metrics";
import type { AppointmentStatus, Business, Service } from "@/lib/types";

type Filter = "all" | "confirmed" | "cancelled";
type Tab = "agenda" | "services";

interface Props {
  businesses: Business[];
  today: string;
}

export default function DashboardClient({ businesses, today }: Props) {
  const router = useRouter();
  const [businessId, setBusinessId] = useState(businesses[0].id);
  const business = useMemo(() => businesses.find((b) => b.id === businessId) ?? businesses[0], [businesses, businessId]);

  const [tab, setTab] = useState<Tab>("agenda");
  const [date, setDate] = useState(today);
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data, error: err } = await supabase
      .from("appointments")
      .select("id, date, start_time, end_time, status, client:clients(name, whatsapp), service:services(name, price)")
      .eq("business_id", businessId)
      .eq("date", date)
      .order("start_time");
    if (err) {
      setError("Não foi possível carregar os agendamentos.");
      return;
    }
    setError(null);
    setRows((data ?? []) as unknown as AppointmentRow[]);
  }, [businessId, date]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // Atualização em tempo real (RLS filtra: o dono só recebe eventos do que pode ver).
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`appts-${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `business_id=eq.${businessId}` }, () => void loadRows())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [businessId, loadRows]);

  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);

  const metrics = useMemo(
    () => computeDayMetrics(business, date, rows, activeServices),
    [business, date, rows, activeServices],
  );

  const visible = rows.filter((r) => filter === "all" || r.status === filter);

  async function setStatus(row: AppointmentRow, status: AppointmentStatus) {
    setBusyId(row.id);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase.from("appointments").update({ status }).eq("id", row.id);
    if (err) {
      // 23P01: ao reativar, o horário pode ter sido reservado por outra pessoa.
      setError(err.code === "23P01" ? "Esse horário já foi ocupado por outro agendamento." : "Não foi possível atualizar.");
    } else if (status === "done") {
      await supabase
        .from("clients")
        .update({ last_visit: row.date })
        .eq("business_id", businessId)
        .eq("whatsapp", row.client?.whatsapp ?? "");
    }
    setBusyId(null);
    await loadRows();
  }

  function logWhatsapp(row: AppointmentRow) {
    // Registra o envio em campaigns (stub). Falha silenciosa: não impede abrir o WhatsApp.
    void fetch("/api/dashboard/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: row.id }),
    }).catch(() => undefined);
  }

  async function signOut() {
    await createSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const heading = format(new Date(`${today}T12:00:00`), "EEEE, dd MMM", { locale: ptBR });

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{business.name}</h1>
          <p className="text-sm capitalize text-neutral-600">Hoje é {heading}</p>
        </div>
        <div className="flex items-center gap-2">
          {businesses.length > 1 && (
            <select className="input !w-auto" aria-label="Negócio" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <a className="btn-ghost" href={`/b/${business.slug}`} target="_blank" rel="noopener noreferrer">Ver página</a>
          <button className="btn-ghost" onClick={signOut}>Sair</button>
        </div>
      </header>

      <nav className="mb-6 flex gap-2" aria-label="Seções">
        {([["agenda", "Agenda"], ["services", "Serviços"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={tab === k ? "btn-primary" : "btn-ghost"}>{label}</button>
        ))}
      </nav>

      {tab === "services" ? (
        <ServicesManager businessId={businessId} onChanged={setServices} />
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <input type="date" className="input !w-auto" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Data" />
            <div className="flex gap-2" role="tablist" aria-label="Filtro">
              {([["all", "Todos"], ["confirmed", "Confirmados"], ["cancelled", "Cancelados"]] as const).map(([k, label]) => (
                <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={filter === k ? "btn-primary !min-h-[40px] !px-3" : "btn-ghost !min-h-[40px] !px-3"}>{label}</button>
              ))}
            </div>
          </div>

          <MetricsBar metrics={metrics} />
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <TodayList rows={visible} businessName={business.name} busyId={busyId} onStatus={setStatus} onWhatsapp={logWhatsapp} />
          {services.length === 0 && (
            <p className="text-xs text-neutral-500">Dica: abra a aba Serviços para o cálculo de “dinheiro perdido” usar seus preços.</p>
          )}
        </div>
      )}
    </main>
  );
}
