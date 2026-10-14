"use client";

interface Props {
  slots: string[];
  loading: boolean;
  selected: string | null;
  onSelect: (time: string) => void;
}

export default function AgendaGrid({ slots, loading, selected, onSelect }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-11 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (slots.length === 0) {
    return <p className="card p-4 text-sm text-neutral-600">Sem horários nesse dia. Tente outra data.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" role="radiogroup" aria-label="Horários">
      {slots.map((t) => {
        const isSel = t === selected;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={isSel}
            onClick={() => onSelect(t)}
            className={`min-h-[44px] rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              isSel
                ? "border-primary bg-primary text-white"
                : "border-neutral-200 bg-white hover:bg-muted"
            }`}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
