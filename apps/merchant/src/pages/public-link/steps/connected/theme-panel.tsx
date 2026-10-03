// Step 1 while connected: the server's theme catalogue (PUT /draft/theme) with
// its category chips, and the starter sites (POST /draft/apply-starter) offered
// until the first publish.
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Info, Sparkles } from "lucide-react";
import { Badge, Button } from "@ui/primitives";
import type { PublicLinkSync, SiteAction, SiteDraft } from "@/entities/site-draft";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { usePlText } from "../../_shared/texts";
import type { ThemeCardProps } from "../theme-step";
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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2">
        {["all", ...categories].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => dispatch({ type: "patchTheme", patch: { filter: id } })}
            className={clsx(
              "rounded-[9px] border px-3 py-[7px] text-[12px] font-medium transition-colors",
              filter === id ? "border-[#0D6EFD] text-[#0D6EFD]" : "border-[var(--octo-border-card)] text-[var(--octo-text-muted)]"
            )}
          >
            {id === "all" ? tx("pl.theme.category.all") : title(id)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
      <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[12px] text-[#0D6EFD]">
        <Info size={14} className="shrink-0" />
        {tx("pl.theme.serverNote")}
      </p>
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
        <Sparkles size={15} className="text-[#0D6EFD]" />
        {tx("pl.starter.title")}
      </p>
      <p className={CARD_NOTE}>{tx("pl.starter.note")}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {server.catalogues.starters.map((starter) => (
          <div key={starter.key} className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{title(starter.key)}</span>
              {starter.key === recommended && <Badge tone="info">{tx("pl.starter.recommended")}</Badge>}
              {starter.key === applied && <Badge tone="success">{tx("pl.theme.applied")}</Badge>}
            </div>
            <span className="text-[11.5px] text-[var(--octo-text-muted)]">
              {tx("pl.starter.pages", { n: starter.pages.length })} · {title(starter.themeKey)}
            </span>
            {confirming === starter.key ? (
              <div role="alertdialog" className="flex flex-col gap-2 rounded-[9px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2.5 py-2">
                <span className="text-[12px] text-[var(--octo-text-primary)]">{tx("pl.starter.confirm")}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => {
                      setConfirming(null);
                      void act(starter.key, () => sync.applyStarter(starter.key));
                    }}
                  >
                    {tx("pl.starter.apply")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                    {tx("pl.common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" disabled={busy !== null} onClick={() => setConfirming(starter.key)} className="w-fit">
                {busy === starter.key ? tx("pl.common.saving") : tx("pl.starter.apply")}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
