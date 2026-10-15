// The table session (place occupancy, US-020) an order belongs to: whether it is still open,
// how many orders it holds and how many still wait for an answer, and closing / reopening it.
import { useCallback, useEffect, useState } from "react";
import { closeOccupancy, getOccupancy, reopenOccupancy, type OccupancyResponse, type OrderResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { isOccupancyOpen, occupancyProblemOf } from "@/entities/order/occupancy";
import { CardTitle, formatDateTime, InfoRow, LINE_COLOR } from "./parts";

const BUTTON =
  "inline-flex h-9 items-center justify-center rounded-[8px] border px-3 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50";

export function SessionCard({ order }: { order: OrderResponse }) {
  const { t, locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const occupancyId = order.occupancyId ?? null;
  const [session, setSession] = useState<OccupancyResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeBusinessId || !occupancyId) return;
    setLoadFailed(false);
    try {
      setSession(await getOccupancy(activeBusinessId, occupancyId));
    } catch {
      setLoadFailed(true);
    }
  }, [activeBusinessId, occupancyId]);

  // Reload when the order moves on (accepting or declining it changes the session's counts).
  useEffect(() => {
    void load();
  }, [load, order.version]);

  if (!occupancyId) return null;

  async function act(kind: "close" | "reopen") {
    if (!activeBusinessId || !session || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const next = kind === "close"
        ? await closeOccupancy(activeBusinessId, session.id, session.version)
        : await reopenOccupancy(activeBusinessId, session.id, session.version);
      setSession(next);
    } catch (e) {
      const { problem, detail } = occupancyProblemOf(e);
      setMessage(t(`orders.session.error.${problem}`).replace("{detail}", detail ?? ""));
      if (problem === "stale") await load();
    } finally {
      setPending(false);
    }
  }

  const open = session ? isOccupancyOpen(session.status) : false;

  return (
    <section className={`flex flex-col gap-4 rounded-[16px] border p-3 ${LINE_COLOR}`}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle>{t("orders.session.title")}</CardTitle>
        {session && (
          <span
            className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${
              open ? "bg-[#e8f8ee] text-[#009a39]" : "bg-[#f1f5f9] text-[#475569] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
            }`}
          >
            {t(open ? "orders.session.open" : "orders.session.closed")}
          </span>
        )}
      </div>

      {loadFailed ? (
        <p className="text-[13px] text-[var(--octo-text-secondary)]">
          {t("orders.session.error.generic")}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>
            {t("orders.session.retry")}
          </button>
        </p>
      ) : !session ? (
        <div className="h-24 animate-pulse rounded-[8px] bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]" />
      ) : (
        <>
          <dl className="flex flex-col gap-3">
            <InfoRow label={t("orders.session.place")} value={session.place.displayName || session.place.code} />
            <InfoRow label={t("orders.session.openedAt")} value={formatDateTime(session.openedAtUtc, locale)} />
            <InfoRow label={t("orders.session.orders")} value={String(session.orderCount)} />
            <InfoRow
              label={t("orders.session.unanswered")}
              value={
                <span className={session.unacceptedOrderCount > 0 ? "font-semibold text-[#b45309]" : undefined}>
                  {String(session.unacceptedOrderCount)}
                </span>
              }
            />
            {session.reopenCount > 0 && <InfoRow label={t("orders.session.reopened")} value={String(session.reopenCount)} />}
          </dl>
          {message && (
            <p role="alert" className="rounded-[8px] bg-[#fef0f0] p-2 text-[13px] text-[#d30202] [[data-theme=dark]_&]:bg-[var(--octo-tone-danger-bg)]">
              {message}
            </p>
          )}
          <div>
            {open ? (
              <button type="button" disabled={pending} onClick={() => void act("close")} className={`${BUTTON} border-[#d30202] text-[#d30202]`}>
                {t("orders.session.close")}
              </button>
            ) : (
              <button type="button" disabled={pending} onClick={() => void act("reopen")} className={`${BUTTON} border-[#0d6efd] text-[#0d6efd]`}>
                {t("orders.session.reopen")}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
