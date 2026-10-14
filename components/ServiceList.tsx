"use client";

import { formatBRL } from "@/lib/format";
import type { PublicService } from "@/lib/types";

interface Props {
  services: PublicService[];
  selectedId: string | null;
  onSelect: (service: PublicService) => void;
}

export default function ServiceList({ services, selectedId, onSelect }: Props) {
  if (services.length === 0) {
    return <p className="card p-4 text-sm text-neutral-600">Nenhum serviço disponível no momento.</p>;
  }
  return (
    <ul className="grid gap-3" role="radiogroup" aria-label="Serviços">
      {services.map((s) => {
        const selected = s.id === selectedId;
        return (
          <li key={s.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(s)}
              className={`card flex min-h-[56px] w-full items-center justify-between gap-3 p-4 text-left transition-colors ${
                selected ? "border-primary ring-2 ring-primary/20" : "hover:bg-muted"
              }`}
            >
              <span>
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-sm text-neutral-500">{s.duration_minutes} min</span>
              </span>
              <span className="font-semibold text-primary">{formatBRL(s.price)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
