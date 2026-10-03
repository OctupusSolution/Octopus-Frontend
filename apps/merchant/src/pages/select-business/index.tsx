// Shown right after sign-in, even with a single business: the merchant picks
// which business to manage, or starts setting up a new one.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Store } from "lucide-react";
import { ApiError } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import { getRestaurantType } from "@/shared/catalog";
import { OnboardingHeader } from "@/pages/onboarding/_shared/header";
import { setupIcon } from "@/pages/onboarding/_shared/assets";

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

/** One of the frame's small line icons, drawn at its exported size. */
function LineIcon({ name }: { name: string }) {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center">
      <img src={setupIcon(name)} alt="" className="block" />
    </span>
  );
}

function BusinessCard({ business, onPick }: { business: TenantConfig; onPick: () => void }) {
  const { t, locale } = useI18n();
  const type = getRestaurantType(business.businessType);

  return (
    <button
      type="button"
      onClick={onPick}
      className="flex h-full w-full flex-col gap-2 rounded-[16px] border-s-4 border-[#0d6efd] bg-white p-3 text-start shadow-[0_0_8px_0_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_0_14px_0_rgba(13,110,253,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0d6efd]"
    >
      <div className="flex w-full items-center gap-2 border-b border-[#cbd5e1] pb-2">
        {type ? (
          <img
            src={typeThumb(type.image)}
            alt=""
            className="h-[66px] w-[63px] shrink-0 rounded-[4px] border border-[#f1f5f9] object-cover"
          />
        ) : (
          <div className="grid h-[66px] w-[63px] shrink-0 place-items-center rounded-[4px] border border-[#f1f5f9] text-[#58606c]">
            <Store size={24} />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[16px] font-semibold leading-[16px] text-black">{business.businessName}</p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#dcffef] px-2 py-1 text-[12px] font-medium leading-[12px] text-[#009a39]">
              <span className="h-[5px] w-[5px] rounded-full bg-[#009a39]" />
              {t("businessPicker.active")}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {type && (
              <p className="flex items-center gap-1 text-[12px] leading-[12px] text-[#0f172a]">
                <LineIcon name="business-food.svg" />
                <span className="truncate">{t(type.nameKey)}</span>
              </p>
            )}
            {/* The frame prints the city here; a business carries no address
                yet, so the line says how many branches it has instead. */}
            <p className="flex items-center gap-1 text-[12px] leading-[12px] text-[#0f172a]">
              <LineIcon name="business-location.svg" />
              {t("businessPicker.branchCount").replace("{n}", String(business.branchCount))}
            </p>
          </div>
        </div>
      </div>
      <p className="flex items-center gap-1 text-[10px] leading-[10px] text-[#0f172a]">
        <LineIcon name="business-created.svg" />
        {t("businessPicker.createdOn").replace("{date}", formatCreatedAt(business.createdAt, locale))}
      </p>
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
    // Light-only, like the frame it is drawn from.
    <div data-theme="light" className="min-h-screen bg-white">
      <OnboardingHeader variant="welcome" onLogoClick={signOut} logoLabel={t("common.signOut")} />

      <main className="mx-auto flex max-w-[1248px] flex-col gap-10 px-6 pb-16 pt-[58px]">
        <div className="flex flex-col gap-4">
          <h1 className="text-[28px] font-semibold leading-[1.15] text-[#0f172a] sm:text-[40px] sm:leading-[40px]">
            {t("businessPicker.title")}
          </h1>
          <p className="text-[16px] leading-[1.5] text-[#58606c]">{t("businessPicker.subtitle")}</p>
        </div>

        <div className="flex flex-col gap-8">
          {loading && businesses.length === 0 && (
            <p className="flex items-center gap-2 text-[14px] text-[#58606c]">
              <Loader2 size={16} className="animate-spin" />
              {t("businessPicker.loading")}
            </p>
          )}

          {error && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
              <span>{t("businessPicker.error.load")}</span>
              <button type="button" onClick={() => void reload()} className="font-semibold underline underline-offset-2">
                {t("businessPicker.retry")}
              </button>
            </div>
          )}

          {pickError && (
            <p role="alert" className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
              {pickError}
            </p>
          )}

          {businesses.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => (
                <div key={business.id} className={picking === business.id ? "h-full opacity-60" : "h-full"} aria-busy={picking === business.id}>
                  <BusinessCard business={business} onPick={() => void pick(business)} />
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate("/select-business/new")}
            className="flex w-full flex-col items-center gap-4 rounded-[16px] border-2 border-dashed border-[#0d6efd] bg-[#f5f9ff] p-4 text-center transition-colors hover:bg-[#ebf3ff]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#0d6efd]">
              <img src={setupIcon("plus-white.svg")} alt="" className="block" />
            </span>
            <span className="flex w-full flex-col gap-3">
              <span className="text-[18px] font-bold leading-[18px] text-[#0f172a]">{t("businessPicker.add.title")}</span>
              <span className="text-[14px] font-medium leading-[14px] text-[#58606c]">{t("businessPicker.add.body")}</span>
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
