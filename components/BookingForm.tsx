"use client";

import { formatBRL, maskWhatsapp } from "@/lib/format";

interface Props {
  businessName: string;
  price: number;
  name: string;
  whatsapp: string;
  consent: boolean;
  honeypot: string;
  submitting: boolean;
  error: string | null;
  onChange: (patch: {
    name?: string;
    whatsapp?: string;
    consent?: boolean;
    honeypot?: string;
  }) => void;
  onSubmit: () => void;
}

export default function BookingForm(p: Props) {
  const nameOk = p.name.trim().length >= 3;
  const waDigits = p.whatsapp.replace(/\D/g, "");
  const waOk = waDigits.length === 10 || waDigits.length === 11;
  const canSubmit = nameOk && waOk && p.consent && !p.submitting;

  return (
    <form
      className="card grid gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) p.onSubmit();
      }}
      noValidate
    >
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          Seu nome
        </label>
        <input
          id="name"
          className="input"
          autoComplete="name"
          maxLength={100}
          value={p.name}
          onChange={(e) => p.onChange({ name: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="whatsapp" className="mb-1 block text-sm font-medium">
          WhatsApp
        </label>
        <input
          id="whatsapp"
          className="input"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 99999-9999"
          value={p.whatsapp}
          onChange={(e) => p.onChange({ whatsapp: maskWhatsapp(e.target.value) })}
          required
        />
      </div>

      {/* Honeypot: invisível para humanos; robôs costumam preencher. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={p.honeypot}
          onChange={(e) => p.onChange({ honeypot: e.target.value })}
        />
      </div>

      <label className="flex items-start gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[#16A34A]"
          checked={p.consent}
          onChange={(e) => p.onChange({ consent: e.target.checked })}
        />
        <span>
          Concordo em compartilhar meu nome e WhatsApp com {p.businessName} para fins de
          agendamento.
        </span>
      </label>

      {p.error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {p.error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={!canSubmit}>
        {p.submitting ? "Agendando..." : `Confirmar agendamento - ${formatBRL(p.price)}`}
      </button>
    </form>
  );
}
