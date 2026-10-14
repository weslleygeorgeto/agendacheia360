"use client";

import { formatBRL, waLink } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";

export interface AppointmentRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  client: { name: string; whatsapp: string } | null;
  service: { name: string; price: number } | null;
}

const BADGE: Record<AppointmentStatus, { label: string; cls: string }> = {
  confirmed: { label: "Confirmado", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", cls: "bg-red-100 text-red-800" },
  done: { label: "Concluído", cls: "bg-neutral-200 text-neutral-700" },
  no_show: { label: "Não compareceu", cls: "bg-yellow-100 text-yellow-800" },
};

interface Props {
  rows: AppointmentRow[];
  businessName: string;
  busyId: string | null;
  onStatus: (row: AppointmentRow, status: AppointmentStatus) => void;
  onWhatsapp: (row: AppointmentRow) => void;
}

export default function TodayList({ rows, businessName, busyId, onStatus, onWhatsapp }: Props) {
  if (rows.length === 0) {
    return <p className="card p-6 text-center text-sm text-neutral-600">Nenhum agendamento neste filtro.</p>;
  }
  return (
    <ul className="grid gap-3">
      {rows.map((r) => {
        const badge = BADGE[r.status];
        const disabled = busyId === r.id;
        const text = `Olá ${r.client?.name ?? ""}! Seu horário na ${businessName} está confirmado para ${r.start_time.slice(0, 5)}.`;
        return (
          <li key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold">{r.start_time.slice(0, 5)}</div>
                <div className="font-medium">{r.client?.name ?? "Cliente"}</div>
                <div className="text-sm text-neutral-600">
                  {r.service?.name ?? "Serviço"} · {r.service ? formatBRL(Number(r.service.price)) : "-"}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "confirmed" && (
                <>
                  <button className="btn-primary !min-h-[40px] !px-3" disabled={disabled} onClick={() => onStatus(r, "done")}>Concluir</button>
                  <button className="btn-ghost !min-h-[40px] !px-3" disabled={disabled} onClick={() => onStatus(r, "no_show")}>No-show</button>
                  <button className="btn-ghost !min-h-[40px] !px-3" disabled={disabled} onClick={() => onStatus(r, "cancelled")}>Cancelar</button>
                </>
              )}
              {r.status === "cancelled" && (
                <button className="btn-ghost !min-h-[40px] !px-3" disabled={disabled} onClick={() => onStatus(r, "confirmed")}>Reativar</button>
              )}
              {r.client && (
                <a
                  className="btn-ghost !min-h-[40px] !px-3"
                  href={waLink(r.client.whatsapp, text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onWhatsapp(r)}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
