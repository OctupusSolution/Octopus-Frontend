// What the server holds for the one selected table — its zone, availability,
// combining group, priority and revision — read fresh a moment after each
// edit settles, so the merchant can see the save actually landed.
import { useEffect, useState } from "react";
import { CloudOff, CloudUpload } from "lucide-react";
import { getSpot, type SpotResponse } from "@octopus/api-client";
import { floorPlanIdOf, isServerId, type FloorPlanDoc, type FloorTable } from "@/entities/floor-plan";
import { useAuth } from "@/app/providers/auth-provider";
import { useAdminText } from "../../_shared/admin-text";

export function SpotServerCard({ table, doc }: { table: FloorTable; doc: FloorPlanDoc }) {
  const at = useAdminText();
  const { activeBusinessId } = useAuth();
  const [spot, setSpot] = useState<SpotResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const saved = isServerId(table.id);

  useEffect(() => {
    setSpot(null);
    setMissing(false);
  }, [table.id]);

  useEffect(() => {
    if (!activeBusinessId || !saved) return;
    let cancelled = false;
    // After the autosave (700ms) and its push have had a chance to run.
    const id = window.setTimeout(async () => {
      try {
        const planId = await floorPlanIdOf(activeBusinessId);
        if (!planId || cancelled) return;
        const next = await getSpot(activeBusinessId, planId, table.id);
        if (!cancelled) {
          setSpot(next);
          setMissing(false);
        }
      } catch {
        if (!cancelled) setMissing(true);
      }
    }, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [activeBusinessId, saved, table.id, doc]);

  if (!saved || missing) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-[var(--octo-soft-bg)] p-3 text-[12.5px] text-[var(--octo-text-muted)]">
        <CloudOff size={15} />
        {at("spot.notSaved")}
      </p>
    );
  }
  if (!spot) return null;

  const zone = spot.zoneId ? (doc.zones.find((z) => z.id === spot.zoneId)?.name ?? "—") : at("spot.noZone");
  const availability = spot.availability.mode + (spot.availability.reasonCode ? ` · ${spot.availability.reasonCode}` : "");
  const rows: [string, string][] = [
    [at("spot.zone"), zone],
    [at("spot.availability"), availability],
    [at("spot.combining"), spot.combining.isCombinable ? (spot.combining.groupCode ?? "✓") : "—"],
    [at("spot.priority"), String(spot.priority)],
    [at("spot.revision"), String(spot.version)],
  ];
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] p-3.5">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">
        <CloudUpload size={15} className="text-[#16a34a]" />
        {at("spot.server")}
      </p>
      <dl className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2">
            <dt className="text-[var(--octo-text-secondary)]">{label}</dt>
            <dd className="truncate font-medium text-[var(--octo-text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
