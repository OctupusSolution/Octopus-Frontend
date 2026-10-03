// Step 1 while connected: the server's theme catalogue (PUT /draft/theme) with
// its category chips, and the starter sites (POST /draft/apply-starter) offered
// until the first publish.
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import type { PublicLinkSync, SiteAction, SiteDraft } from "@/entities/site-draft";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { usePlText } from "../../_shared/texts";
import { PlButton, PlInfoBanner } from "../../ui/kit";
import { THEME_CHIP, THEME_CHIP_BAR, THEME_CHIP_OFF, THEME_CHIP_ON, THEME_GRID, type ThemeCardProps } from "../theme-step";
import { CARD, CARD_NOTE, CARD_TITLE, useBusy } from "./common";

const STYLE_FOR: Record<string, "elegant" | "modern" | "warm"> = { default: "modern", warm: "warm", midnight: "elegant" };
const title = (key: string) => key.charAt(0).toUpperCase() + key.slice(1).replace(/[-_]+/g, " ");

export function ServerThemeGrid({
  sync,
  draft,
  dispatch,
  device,
  onDevice,
  renderCard,
}: {
  sync: PublicLinkSync;
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  device: PreviewDevice;
  onDevice: (device: PreviewDevice) => void;
  renderCard: (props: ThemeCardProps & { key: string }) => ReactNode;
}) {
  const tx = usePlText();
  const { act, busy } = useBusy();
  const catalogues = sync.server!.catalogues!;
  const applied = sync.server!.overview.themeKey;
  const categories = Array.from(new Set(catalogues.themes.map((theme) => theme.category).filter(Boolean)));
  const filter = categories.includes(draft.theme.filter) ? draft.theme.filter : "all";
  const themes = catalogues.themes.filter((theme) => filter === "all" || theme.category === filter);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className={clsx(THEME_CHIP_BAR, "!justify-start")}>
        {["all", ...categories].map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => dispatch({ type: "patchTheme", patch: { filter: id } })}
            className={clsx(THEME_CHIP, filter === id ? THEME_CHIP_ON : THEME_CHIP_OFF)}
          >
            {id === "all" ? tx("pl.theme.category.all") : title(id)}
          </button>
        ))}
      </div>
      <div className={THEME_GRID}>
        {themes.map((theme) =>
          renderCard({
            key: theme.key,
            theme: {
              id: theme.key,
              nameKey: `pl.theme.${theme.key}.name`,
              descKey: `pl.theme.${theme.key}.desc`,
              styleId: STYLE_FOR[theme.key] ?? "modern",
              filters: [theme.category],
              recommended: theme.recommended,
            },
            name: title(theme.key),
            description: busy === theme.key ? tx("pl.common.saving") : theme.key === applied ? tx("pl.theme.applied") : title(theme.category),
            swatches: ["core.primary", "core.accent", "background.surface", "text.heading"]
              .map((token) => theme.colors[token])
              .filter((c): c is string => Boolean(c)),
            image: theme.previewImages[0],
            active: applied === theme.key,
            previewDevice: device,
            onPreviewDevice: onDevice,
            onSelect: () => {
              if (theme.key !== applied && busy === null) void act(theme.key, () => sync.applyTheme(theme.key));
            },
          })
        )}
      </div>
      <PlInfoBanner>{tx("pl.theme.serverNote")}</PlInfoBanner>
    </div>
  );
}

export function StarterCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { act, busy } = useBusy();
  const [confirming, setConfirming] = useState<string | null>(null);
  const server = sync.server;
  if (!server?.catalogues || !server.overview.starter.eligible || server.catalogues.starters.length === 0) return null;
  const recommended = server.overview.starter.recommendedCode;
  const applied = server.overview.starter.appliedCode;

  return (
    <div className={CARD}>
      <p className={clsx(CARD_TITLE, "flex items-center gap-2")}>
        <Sparkles size={16} className="text-[var(--pl-primary)]" />
        {tx("pl.starter.title")}
      </p>
      <p className={CARD_NOTE}>{tx("pl.starter.note")}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {server.catalogues.starters.map((starter) => (
          <div key={starter.key} className="flex flex-col gap-3 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-g50)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{title(starter.key)}</span>
              {starter.key === recommended && (
                <span className="rounded-[4px] bg-[var(--pl-primary)] p-1 text-[8px] font-medium leading-[8px] text-white">{tx("pl.starter.recommended")}</span>
              )}
              {starter.key === applied && (
                <span className="rounded-[4px] bg-[var(--pl-success-soft)] p-1 text-[10px] font-medium leading-[10px] text-[var(--pl-success)]">{tx("pl.theme.applied")}</span>
              )}
            </div>
            <span className="text-[12px] leading-[1.4] text-[var(--pl-text-3)]">
              {tx("pl.starter.pages", { n: starter.pages.length })} · {title(starter.themeKey)}
            </span>
            {confirming === starter.key ? (
              <div role="alertdialog" className="flex flex-col gap-2 rounded-[8px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-2">
                <span className="text-[12px] leading-[1.4] text-[var(--pl-text)]">{tx("pl.starter.confirm")}</span>
                <div className="flex gap-2">
                  <PlButton
                    size="xs"
                    disabled={busy !== null}
                    onClick={() => {
                      setConfirming(null);
                      void act(starter.key, () => sync.applyStarter(starter.key));
                    }}
                  >
                    {tx("pl.starter.apply")}
                  </PlButton>
                  <PlButton size="xs" variant="plain" onClick={() => setConfirming(null)}>
                    {tx("pl.common.cancel")}
                  </PlButton>
                </div>
              </div>
            ) : (
              <PlButton size="xs" variant="outline" disabled={busy !== null} onClick={() => setConfirming(starter.key)} className="w-fit">
                {busy === starter.key ? tx("pl.common.saving") : tx("pl.starter.apply")}
              </PlButton>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
