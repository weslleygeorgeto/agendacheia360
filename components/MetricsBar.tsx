import { formatBRL } from "@/lib/format";
import type { DayMetrics } from "@/lib/metrics";

export default function MetricsBar({ metrics }: { metrics: DayMetrics }) {
  const items = [
    { label: "Horários vagos", value: String(metrics.vacantSlots), hint: `de ${metrics.totalSlots}` },
    { label: "Dinheiro perdido", value: formatBRL(metrics.lostMoney), hint: "estimativa" },
    { label: "Ocupação", value: `${Math.round(metrics.occupancyRate * 100)}%`, hint: `${metrics.occupiedSlots} slots` },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      {items.map((i) => (
        <div key={i.label} className="card p-3 md:p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{i.label}</div>
          <div className="mt-1 text-lg font-bold md:text-2xl">{i.value}</div>
          <div className="text-xs text-neutral-500">{i.hint}</div>
        </div>
      ))}
    </div>
  );
}
