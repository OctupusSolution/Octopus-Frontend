// Shown right after sign-in, even with a single business: the merchant picks
// which business to manage, or starts setting up a new one.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Settings, Store, UtensilsCrossed } from "lucide-react";
import { ApiError } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import { getRestaurantType } from "@/shared/catalog";
import { OnboardingHeader } from "@/pages/onboarding/_shared/header";

function typeThumb(file: string): string {
  return new URL(`../../../../assets/onboarding-Type/${file}`, import.meta.url).href;
}

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BusinessCard({ business, onPick }: { business: TenantConfig; onPick: () => void }) {
  const { t, locale } = useI18n();
  const type = getRestaurantType(business.businessType);

  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-col rounded-2xl border border-[var(--octo-border-card)] border-s-4 border-s-[#0D6EFD] bg-[var(--octo-card)] px-4 pb-3 pt-4 text-start shadow-[0_6px_20px_-12px_rgba(15,23,42,0.25)] transition-shadow hover:shadow-[0_10px_28px_-12px_rgba(13,110,253,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0D6EFD]"
    >
      <div className="flex items-start gap-3">
        {type ? (
          <img src={typeThumb(type.image)} alt="" className="h-[62px] w-[62px] shrink-0 rounded-md object-cover" />
        ) : (
          <div className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-md bg-[var(--octo-shell)] text-[var(--octo-text-secondary)]">
            <Store size={24} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[16px] font-semibold text-[var(--octo-text-primary)]">{business.businessName}</p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#22C55E]/12 px-2 py-0.5 text-[11.5px] font-medium text-[#16a34a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E]" />
              {t("businessPicker.active")}
            </span>
          </div>
          {type && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
              <UtensilsCrossed size={14} className="shrink-0" />
              <span className="truncate">{t(type.nameKey)}</span>
            </p>
          )}
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
            <Store size={14} className="shrink-0" />
            {t("businessPicker.branchCount").replace("{n}", String(business.branchCount))}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-[var(--octo-border-card)] pt-2.5 text-[11px] text-[var(--octo-text-secondary)]">
        <Settings size={13} />
        {t("businessPicker.createdOn").replace("{date}", formatCreatedAt(business.createdAt, locale))}
      </div>
    </button>
  );
}

export function SelectBusinessPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { businesses, switchBusiness, loading, error, reload } = useTenantConfig();
  const [picking, setPicking] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  async function pick(business: TenantConfig) {
    if (picking) return;
    setPicking(business.id);
    setPickError(null);
    try {
      await switchBusiness(business.id);
      navigate("/", { replace: true });
    } catch (err) {
      setPickError(err instanceof ApiError ? err.problem?.errorCode ?? err.message : t("businessPicker.error.pick"));
    } finally {
      setPicking(null);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--octo-card)]">
      <OnboardingHeader onLogoClick={signOut} logoLabel={t("common.signOut")} />

      <main className="mx-auto max-w-[1248px] px-6 pb-16 pt-12 sm:pt-16">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)] sm:text-[40px]">
          {t("businessPicker.title")}
        </h1>
        <p className="mt-3 text-[14px] text-[var(--octo-text-secondary)] sm:text-[16px]">
          {t("businessPicker.subtitle")}
        </p>

        {loading && businesses.length === 0 && (
          <p className="mt-8 flex items-center gap-2 text-[14px] text-[var(--octo-text-secondary)]">
            <Loader2 size={16} className="animate-spin" />
            {t("businessPicker.loading")}
          </p>
        )}

        {error && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
            <span>{t("businessPicker.error.load")}</span>
            <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2">
              {t("businessPicker.retry")}
            </button>
          </div>
        )}

        {pickError && (
          <p role="alert" className="mt-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
            {pickError}
          </p>
        )}

        {businesses.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <div key={business.id} className={picking === business.id ? "opacity-60" : undefined} aria-busy={picking === business.id}>
                <BusinessCard business={business} onPick={() => void pick(business)} />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/select-business/new")}
          className="mt-6 flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#0D6EFD] bg-[#0D6EFD]/[0.04] px-6 py-6 text-center transition-colors hover:bg-[#0D6EFD]/[0.08]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0D6EFD] text-white">
            <Plus size={20} />
          </span>
          <span className="mt-3 text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("businessPicker.add.title")}</span>
          <span className="mt-1.5 text-[13.5px] text-[var(--octo-text-secondary)]">{t("businessPicker.add.body")}</span>
        </button>
      </main>
    </div>
  );
}
