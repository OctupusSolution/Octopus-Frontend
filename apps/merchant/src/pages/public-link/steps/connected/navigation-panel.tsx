// Step 4 while connected: the site's menu (GET/PUT /draft/navigation, replaced
// whole) and footer (GET/PUT /draft/footer). With no explicit menu items the
// storefront header lists every visible page in order; the first edit here
// materialises that list so the merchant edits what they see.
import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, X } from "lucide-react";
import { Button, Checkbox, Input, Select } from "@ui/primitives";
import type { FooterGroupDto, NavigationOptionsDto, NavItemDto, SocialLinkDto } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { pickText, withText, type PublicLinkServer, type PublicLinkSync } from "@/entities/site-draft";
import { usePlText } from "../../_shared/texts";
import { ReorderList } from "../../ui/reorder-list";
import { Switch } from "../../ui/switch";
import { CARD, CARD_NOTE, CARD_TITLE, orderedPages, pageTitle, SMALL_BUTTON, useBusy } from "./common";

const DEFAULT_OPTIONS: NavigationOptionsDto = { stickyHeader: false, showActivePageIndicator: false, showIcons: false, openLinksInSameTab: false };

function effectiveItems(server: PublicLinkServer): NavItemDto[] {
  const items = server.navigation?.items ?? [];
  if (items.length) return items;
  return orderedPages(server)
    .filter((p) => p.visibility !== "hidden")
    .map((p) => ({ target: { kind: "page", pageId: p.pageId }, showInHeader: true, showInDrawer: true, children: [] }));
}

function itemLabel(server: PublicLinkServer, item: NavItemDto, lang: string, fallback: string): string {
  const own = pickText(item.label, lang, fallback);
  if (own) return own;
  if (item.target?.kind === "page" || item.target?.kind === "anchor") {
    return pageTitle(server.overview.pages.find((p) => p.pageId === item.target?.pageId), lang, fallback);
  }
  return item.target?.url ?? "—";
}

const keyOf = (item: NavItemDto) => item.id ?? `${item.target?.kind}:${item.target?.pageId ?? item.target?.url ?? pickText(item.label, "en")}`;

export function NavigationDisplayCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { t } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const items = effectiveItems(server);
  const options = server.navigation?.options ?? DEFAULT_OPTIONS;

  const save = (nextItems: NavItemDto[], nextOptions: NavigationOptionsDto = options) =>
    void act("nav", () => sync.saveNavigation({ items: nextItems, options: nextOptions }));
  const allHeader = items.length > 0 && items.every((i) => i.showInHeader);
  const allDrawer = items.length > 0 && items.every((i) => i.showInDrawer);
  const option = (key: keyof NavigationOptionsDto, label: string, note: string) => (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>
      </div>
      <Switch checked={options[key]} onChange={() => busy === null && save(server.navigation?.items ?? [], { ...options, [key]: !options[key] })} label={label} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className={CARD}>
        <p className={CARD_TITLE}>{t("publicLink.navigation.display")}</p>
        <Checkbox
          checked={allHeader}
          disabled={busy !== null}
          onChange={(e) => save(items.map((i) => ({ ...i, showInHeader: e.target.checked })))}
          label={t("publicLink.navigation.showInHeader")}
        />
        <Checkbox
          checked={allDrawer}
          disabled={busy !== null}
          onChange={(e) => save(items.map((i) => ({ ...i, showInDrawer: e.target.checked })))}
          label={t("publicLink.navigation.showInDrawer")}
        />
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <p className={CARD_TITLE}>{t("publicLink.navigation.globalOptions")}</p>
        {option("stickyHeader", t("publicLink.navigation.stickyHeader"), t("publicLink.navigation.stickyHeaderNote"))}
        {option("showActivePageIndicator", t("publicLink.navigation.activeIndicator"), t("publicLink.navigation.activeIndicatorNote"))}
        {option("showIcons", t("publicLink.navigation.showIcons"), t("publicLink.navigation.showIconsNote"))}
        {option("openLinksInSameTab", t("publicLink.navigation.sameTab"), t("publicLink.navigation.sameTabNote"))}
        {busy && <span className="text-[11px] text-[var(--octo-text-muted)]">{tx("pl.common.saving")}</span>}
      </div>
    </div>
  );
}

export function NavigationItemsCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { t, locale } = useI18n();
  const { act, busy } = useBusy();
  const [pickPage, setPickPage] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const server = sync.server!;
  const lang = sync.editLanguage;
  const items = effectiveItems(server);
  const explicit = (server.navigation?.items ?? []).length > 0;
  const options = server.navigation?.options ?? DEFAULT_OPTIONS;
  const inMenu = new Set(items.filter((i) => i.target?.kind === "page").map((i) => i.target?.pageId));
  const addable = orderedPages(server).filter((p) => !inMenu.has(p.pageId));
  const max = server.catalogues?.limits.maxNavTopLevelItems ?? server.overview.limits.maxNavTopLevelItems;

  const save = (next: NavItemDto[]) => act("nav", () => sync.saveNavigation({ items: next, options }));

  return (
    <div className={CARD}>
      <p className={CARD_TITLE}>{t("publicLink.navigation.pageOrder")}</p>
      {!explicit && <p className={CARD_NOTE}>{tx("pl.nav.empty")}</p>}
      <ReorderList
        items={items}
        getId={keyOf}
        getLabel={(item) => itemLabel(server, item, locale, lang)}
        onReorder={(next) => void save(next)}
        renderRow={(item, index, grip) => {
          const hidden = !item.showInHeader && !item.showInDrawer;
          const label = itemLabel(server, item, locale, lang);
          return (
            <>
              {grip}
              <span className="flex-1 truncate text-[12.5px] text-[var(--octo-text-primary)]">
                {label}
                {(item.children ?? []).length > 0 && <span className="ms-1 text-[11px] text-[var(--octo-text-muted)]">+{item.children!.length}</span>}
              </span>
              <button
                type="button"
                aria-label={`${label} — ${t(hidden ? "publicLink.nav.showPage" : "publicLink.nav.hidePage")}`}
                aria-pressed={hidden}
                disabled={busy !== null}
                onClick={() => void save(items.map((it, i) => (i === index ? { ...it, showInHeader: hidden, showInDrawer: hidden } : it)))}
                className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] hover:text-[var(--octo-text-secondary)]"
              >
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                aria-label={`${label} — ${tx("pl.common.remove")}`}
                disabled={busy !== null}
                onClick={() => void save(items.filter((_it, i) => i !== index))}
                className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
              >
                <X size={14} />
              </button>
            </>
          );
        }}
      />
      {(server.navigation?.warnings ?? []).length > 0 && <p className="text-[11px] text-[#B45309]">{tx("pl.nav.warning")}</p>}

      {items.length < max && addable.length > 0 && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select aria-label={tx("pl.nav.addPage")} value={pickPage} onChange={(e) => setPickPage(e.target.value)}>
              <option value="">{tx("pl.nav.addPage")}</option>
              {addable.map((p) => (
                <option key={p.pageId} value={p.pageId}>
                  {pageTitle(p, locale, lang)}
                </option>
              ))}
            </Select>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            disabled={!pickPage || busy !== null}
            onClick={() =>
              void save([...items, { target: { kind: "page", pageId: pickPage }, showInHeader: true, showInDrawer: true, children: [] }]).then(
                (ok) => ok && setPickPage("")
              )
            }
          >
            {tx("pl.common.add")}
          </Button>
        </div>
      )}
      {items.length < max && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input aria-label={tx("pl.nav.linkLabel")} placeholder={tx("pl.nav.linkLabel")} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input aria-label="URL" dir="ltr" placeholder={tx("pl.nav.linkUrl")} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={13} />}
            disabled={!linkLabel.trim() || !/^https:\/\/\S+\.\S+/.test(linkUrl) || busy !== null}
            onClick={() =>
              void save([
                ...items,
                {
                  label: withText(null, lang, linkLabel),
                  target: { kind: "external", url: linkUrl, openInNewTab: !options.openLinksInSameTab },
                  showInHeader: true,
                  showInDrawer: true,
                  children: [],
                },
              ]).then((ok) => {
                if (ok) {
                  setLinkLabel("");
                  setLinkUrl("");
                }
              })
            }
          >
            {tx("pl.nav.addLink")}
          </Button>
        </div>
      )}
      <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.navigation.pageOrderHint")}</p>
    </div>
  );
}

/** The footer, edited as a local copy and saved whole. */
export function FooterCard({ sync }: { sync: PublicLinkSync }) {
  const tx = usePlText();
  const { locale } = useI18n();
  const { act, busy } = useBusy();
  const server = sync.server!;
  const lang = sync.editLanguage;
  const footer = server.footer;
  const [groups, setGroups] = useState<FooterGroupDto[]>(footer?.groups ?? []);
  const [social, setSocial] = useState<SocialLinkDto[]>(footer?.socialLinks ?? []);
  const [contact, setContact] = useState(footer?.contact ?? {});
  const [saved, setSaved] = useState(false);

  // A fresh server copy (another save, a starter, a page deletion) replaces the local copy.
  useEffect(() => {
    setGroups(footer?.groups ?? []);
    setSocial(footer?.socialLinks ?? []);
    setContact(footer?.contact ?? {});
  }, [footer]);

  const networks = server.catalogues?.socialNetworks ?? [];
  const limits = server.catalogues?.limits;
  const pages = orderedPages(server);

  function togglePage(groupIndex: number, pageId: string) {
    setGroups((gs) =>
      gs.map((g, i) => {
        if (i !== groupIndex) return g;
        const links = g.links ?? [];
        const has = links.some((l) => l.target.kind === "page" && l.target.pageId === pageId);
        return { ...g, links: has ? links.filter((l) => !(l.target.kind === "page" && l.target.pageId === pageId)) : [...links, { target: { kind: "page", pageId } }] };
      })
    );
  }

  function save() {
    setSaved(false);
    void act("footer", () =>
      sync.saveFooter({
        groups,
        socialLinks: social.filter((s) => s.network && s.url.trim()),
        contact,
      })
    ).then((ok) => setSaved(ok));
  }

  return (
    <div className={CARD}>
      <p className={CARD_TITLE}>{tx("pl.footer.title")}</p>
      <p className={CARD_NOTE}>{tx("pl.footer.note")}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-3">
          {groups.map((group, gi) => (
            <div key={group.id ?? `g${gi}`} className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    aria-label={tx("pl.footer.group")}
                    placeholder={tx("pl.footer.group")}
                    value={group.title?.[lang] ?? ""}
                    onChange={(e) => setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, title: withText(g.title, lang, e.target.value) } : g)))}
                  />
                </div>
                <button
                  type="button"
                  aria-label={tx("pl.common.remove")}
                  onClick={() => setGroups((gs) => gs.filter((_g, i) => i !== gi))}
                  className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {pages.map((p) => (
                <Checkbox
                  key={p.pageId}
                  checked={(group.links ?? []).some((l) => l.target.kind === "page" && l.target.pageId === p.pageId)}
                  onChange={() => togglePage(gi, p.pageId)}
                  label={pageTitle(p, locale, lang)}
                />
              ))}
            </div>
          ))}
          {(!limits || groups.length < limits.maxFooterGroups) && (
            <button type="button" className={SMALL_BUTTON} onClick={() => setGroups((gs) => [...gs, { title: {}, links: [] }])}>
              <Plus size={13} />
              {tx("pl.footer.addGroup")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.footer.social")}</span>
          {social.map((link, si) => (
            <div key={si} className="flex items-center gap-2">
              <div className="w-[120px] shrink-0">
                <Select
                  aria-label={tx("pl.footer.social")}
                  value={link.network}
                  onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, network: e.target.value } : l)))}
                >
                  {networks.map((n) => (
                    <option key={n.key} value={n.key}>
                      {n.key.charAt(0).toUpperCase() + n.key.slice(1)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  aria-label="URL"
                  dir="ltr"
                  placeholder="https://"
                  value={link.url}
                  onChange={(e) => setSocial((ls) => ls.map((l, i) => (i === si ? { ...l, url: e.target.value.trim() } : l)))}
                />
              </div>
              <button type="button" aria-label={tx("pl.common.remove")} onClick={() => setSocial((ls) => ls.filter((_l, i) => i !== si))} className="rounded p-1 text-[var(--octo-text-faint)] hover:text-[#EF4444]">
                <X size={13} />
              </button>
            </div>
          ))}
          {networks.length > 0 && (!limits || social.length < limits.maxSocialLinks) && (
            <button type="button" className={SMALL_BUTTON + " w-fit"} onClick={() => setSocial((ls) => [...ls, { network: networks[0].key, url: "" }])}>
              <Plus size={13} />
              {tx("pl.footer.addSocial")}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{tx("pl.footer.contact")}</span>
          {(["address", "hours", "phone"] as const).map((field) => (
            <Input
              key={field}
              label={tx(`pl.footer.${field}`)}
              value={contact[field]?.[lang] ?? ""}
              onChange={(e) => setContact((c) => ({ ...c, [field]: withText(c[field], lang, e.target.value) }))}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy !== null}>
          {busy ? tx("pl.common.saving") : tx("pl.common.save")}
        </Button>
        {saved && <span className="text-[11.5px] text-[#16a34a]">{tx("pl.footer.saved")}</span>}
        {(footer?.warnings ?? []).length > 0 && <span className="text-[11px] text-[#B45309]">{tx("pl.nav.warning")}</span>}
      </div>
    </div>
  );
}
