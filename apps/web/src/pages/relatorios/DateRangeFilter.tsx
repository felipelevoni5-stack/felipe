import { useEffect, useState } from "react";
import type { DateRange } from "../../api/reports";

type Preset = "hoje" | "semana" | "mes" | "personalizado";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function computeRange(preset: Preset, customFrom: string, customTo: string): DateRange {
  const now = new Date();
  if (preset === "hoje") {
    return { from: startOfDay(now).toISOString(), to: now.toISOString() };
  }
  if (preset === "semana") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: startOfDay(from).toISOString(), to: now.toISOString() };
  }
  if (preset === "mes") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: startOfDay(from).toISOString(), to: now.toISOString() };
  }
  return {
    from: customFrom ? new Date(customFrom).toISOString() : undefined,
    to: customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined,
  };
}

export function DateRangeFilter({ onChange }: { onChange: (range: DateRange) => void }) {
  const [preset, setPreset] = useState<Preset>("hoje");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    onChange(computeRange(preset, customFrom, customTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="hoje">Hoje</option>
        <option value="semana">Últimos 7 dias</option>
        <option value="mes">Últimos 30 dias</option>
        <option value="personalizado">Período personalizado</option>
      </select>
      {preset === "personalizado" && (
        <>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-slate-400">até</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </>
      )}
    </div>
  );
}
