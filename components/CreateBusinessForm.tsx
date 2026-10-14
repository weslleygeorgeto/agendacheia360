"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { maskWhatsapp } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/validation";

function slugify(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function CreateBusinessForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const wa = normalizeWhatsapp(whatsapp);
    if (name.trim().length < 2) return setError("Informe o nome do negócio.");
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) return setError("Link inválido: use 3-60 letras minúsculas, números ou hífen.");
    if (!wa) return setError("WhatsApp inválido.");

    setSaving(true);
    const supabase = createSupabaseBrowser();
    const { error: err } = await supabase
      .from("businesses")
      .insert({ owner_id: userId, name: name.trim(), slug, whatsapp: wa });
    setSaving(false);
    if (err) {
      setError(err.code === "23505" ? "Esse link já está em uso. Escolha outro." : "Não foi possível criar o negócio.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto grid max-w-md gap-4 p-5">
      <h2 className="text-xl font-bold">Crie seu negócio</h2>
      <div>
        <label htmlFor="b-name" className="mb-1 block text-sm font-medium">Nome</label>
        <input id="b-name" className="input" value={name} maxLength={100} onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} />
      </div>
      <div>
        <label htmlFor="b-slug" className="mb-1 block text-sm font-medium">Link de agendamento</label>
        <input id="b-slug" className="input" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} />
        <p className="mt-1 text-xs text-neutral-500">/b/{slug || "seu-negocio"}</p>
      </div>
      <div>
        <label htmlFor="b-wa" className="mb-1 block text-sm font-medium">WhatsApp</label>
        <input id="b-wa" className="input" inputMode="tel" placeholder="(11) 99999-9999" value={whatsapp} onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button className="btn-primary" disabled={saving}>{saving ? "Criando..." : "Criar negócio"}</button>
    </form>
  );
}
