"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { formatBRL } from "@/lib/format";
import type { Service } from "@/lib/types";

interface Props {
  businessId: string;
  onChanged: (services: Service[]) => void;
}

export default function ServicesManager({ businessId, onChanged }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const { data, error: err } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at");
    if (err) {
      setError("Não foi possível carregar os serviços.");
      return;
    }
    const list = (data ?? []).map((s) => ({ ...s, price: Number(s.price) })) as Service[];
    setServices(list);
    onChanged(list);
  }, [businessId, onChanged]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dur = Number(duration);
    const prc = Number(price.replace(",", "."));
    if (name.trim().length < 2 || !Number.isInteger(dur) || dur < 5 || dur > 480 || !(prc >= 0)) {
      setError("Confira nome, duração (5-480 min) e preço.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase
      .from("services")
      .insert({ business_id: businessId, name: name.trim(), duration_minutes: dur, price: prc });
    setSaving(false);
    if (err) {
      setError("Não foi possível salvar o serviço.");
      return;
    }
    setName("");
    setPrice("");
    await load();
  }

  async function toggle(s: Service) {
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    if (err) setError("Não foi possível atualizar.");
    await load();
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={add} className="card grid gap-3 p-4 md:grid-cols-[1fr_120px_140px_auto] md:items-end">
        <div>
          <label htmlFor="s-name" className="mb-1 block text-sm font-medium">Serviço</label>
          <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </div>
        <div>
          <label htmlFor="s-dur" className="mb-1 block text-sm font-medium">Duração (min)</label>
          <input id="s-dur" className="input" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div>
          <label htmlFor="s-price" className="mb-1 block text-sm font-medium">Preço (R$)</label>
          <input id="s-price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={saving}>{saving ? "Salvando..." : "Adicionar"}</button>
      </form>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <ul className="grid gap-2">
        {services.map((s) => (
          <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
            <div className={s.active ? "" : "opacity-50"}>
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-neutral-600">{s.duration_minutes} min · {formatBRL(s.price)}</div>
            </div>
            <button className="btn-ghost !min-h-[40px] !px-3" onClick={() => toggle(s)}>
              {s.active ? "Desativar" : "Ativar"}
            </button>
          </li>
        ))}
        {services.length === 0 && <li className="card p-4 text-sm text-neutral-600">Cadastre seu primeiro serviço acima.</li>}
      </ul>
    </div>
  );
}
