import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, CircleCheck, Plus } from "lucide-react";
import { Badge, Button, EmptyState } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig, type TenantConfig } from "@/app/providers/tenant-config-provider";
import { getRestaurantType, getVertical } from "@/shared/catalog";

function formatCreatedAt(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function BusinessCard({
  business,
  active,
  onSwitch,
}: {
  business: TenantConfig;
  active: boolean;
  onSwitch: () => void;
}) {
  const { t, locale } = useI18n();
  const vertical = getVertical(business.vertical);
  const type = getRestaurantType(business.businessType);

  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
            {business.businessName}
          </p>
          <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
            {t("settings.businesses.branchCount").replace("{n}", String(business.branchCount))}
            {" · "}
            {formatCreatedAt(business.createdAt, locale)}
          </p>
        </div>
        {active && <Badge tone="success">{t("settings.businesses.active")}</Badge>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {vertical && <Badge tone="neutral">{t(vertical.nameKey)}</Badge>}
        {type && <Badge tone="neutral">{t(type.nameKey)}</Badge>}
      </div>

      <div className="mt-auto pt-4">
        {active ? (
          <Button variant="secondary" size="sm" className="w-full" disabled>
            {t("settings.businesses.active")}
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={onSwitch}>
            {t("settings.businesses.switch")}
          </Button>
        )}
      </div>
    </article>
  );
}

export function BusinessesSettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { businesses, activeTenantId, switchBusiness } = useTenantConfig();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  // The create wizard lives on its own route and hands the new name back via
  // navigation state on redirect, rather than a callback prop.
  useEffect(() => {
    const created = (location.state as { created?: string } | null)?.created;
    if (!created) return;
    setToast(t("settings.businesses.created").replace("{name}", created));
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, t]);

  function handleSwitch(business: TenantConfig) {
    switchBusiness(business.id);
    setToast(t("settings.businesses.switched").replace("{name}", business.businessName));
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.businesses.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.businesses.subtitle")}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate("/settings/businesses/new")}>
          {t("settings.businesses.create")}
        </Button>
      </header>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("settings.businesses.title")}
          </h2>
          <span className="text-[11.5px] text-[var(--octo-text-faint)]">{businesses.length}</span>
        </div>

        {businesses.length === 0 ? (
          <EmptyState
            icon={<Building2 size={18} />}
            title={t("settings.businesses.emptyTitle")}
            description={t("settings.businesses.emptyBody")}
            action={
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => navigate("/settings/businesses/new")}>
                {t("settings.businesses.create")}
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {businesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                active={business.id === activeTenantId}
                onSwitch={() => handleSwitch(business)}
              />
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
