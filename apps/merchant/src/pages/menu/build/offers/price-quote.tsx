// The platform's own price for the offer as edited (POST /offers/price-quote),
// under the locally computed ledgers: the local figures use the prices typed
// in this draft, the quote uses the catalog's saved prices and the server's
// rounding — so a mismatch here is worth a look before publishing.
import { useEffect, useState } from "react";
import type { OfferPriceQuoteResponse, MoneyDto } from "@octopus/api-client";
import { describeApiError, quoteOffer, useMenuCurrency, type Offer } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useMenuCopy } from "../../copy";

const fmt = (m: MoneyDto) => `${m.currency} ${Number(m.amount.toFixed(2))}`;

export function OfferPriceQuote({ offer }: { offer: Offer }) {
  const c = useMenuCopy();
  const { activeBusinessId } = useAuth();
  const currency = useMenuCurrency();
  const [quote, setQuote] = useState<OfferPriceQuoteResponse | null | "none">(null);
  const [error, setError] = useState<string | null>(null);
  // Only what the quote depends on — not name, image or channels.
  const basis = JSON.stringify([offer.entries.map((e) => [e.itemId, e.qty]), offer.pricing.role, offer.pricing.offerPrice, offer.pricing.discount]);

  useEffect(() => {
    if (!activeBusinessId || !currency.data) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setError(null);
      quoteOffer(activeBusinessId, offer, currency.data!)
        .then((q) => !cancelled && setQuote(q ?? "none"))
        .catch((err) => {
          if (cancelled) return;
          setQuote(null);
          setError(describeApiError(err));
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId, currency.data, basis]);

  if (!activeBusinessId) return null;
  return (
    <section className="rounded-[10px] border border-[var(--octo-border-card)] p-4">
      <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{c("offers.quoteTitle")}</h3>
      <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-secondary)]">{c("offers.quoteHint")}</p>
      {error ? (
        <p role="alert" className="mt-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      ) : quote === "none" ? (
        <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{c("offers.quoteUnavailable")}</p>
      ) : !quote ? (
        <p className="mt-2 text-[12.5px] text-[var(--octo-text-muted)]">{c("loading")}</p>
      ) : (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [c("offers.quoteReference"), fmt(quote.referenceTotal)],
            [c("offers.quotePrice"), fmt(quote.price)],
            [c("offers.quoteSaving"), `${fmt(quote.saving)} (${Number(quote.savingPercent.toFixed(1))}%)`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] bg-[var(--octo-hover)] px-2 py-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-muted)]">{label}</dt>
              <dd className="mt-0.5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
