// One order's history, newest first (GET /{id}/activity). The summary never
// carries personal data, so it is safe to show as-is.
import { humanizeCode, OrderEmptyNote, OrderSection, useOrderText, type OrderWorkspace } from "@/entities/order";

function summaryText(summary: Record<string, unknown>): string {
  return Object.entries(summary)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${humanizeCode(key)}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

export function ActivitySection({ ws }: { ws: OrderWorkspace }) {
  const { tx } = useOrderText();
  return (
    <OrderSection title={tx("activity.title")}>
      {ws.activity.length === 0 ? (
        <OrderEmptyNote>{tx("activity.empty")}</OrderEmptyNote>
      ) : (
        <ol className="relative flex flex-col gap-3 border-s border-[var(--octo-divider)] ps-4">
          {ws.activity.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#0D6EFD]" aria-hidden="true" />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{humanizeCode(entry.action)}</span>
                <span className="text-[11.5px] text-[var(--octo-text-muted)]">
                  {new Date(entry.occurredAtUtc).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--octo-text-muted)]">
                {entry.actorDisplay ?? tx("activity.system")}
                {Object.keys(entry.changeSummary ?? {}).length > 0 ? ` · ${summaryText(entry.changeSummary)}` : ""}
              </p>
            </li>
          ))}
        </ol>
      )}
    </OrderSection>
  );
}
