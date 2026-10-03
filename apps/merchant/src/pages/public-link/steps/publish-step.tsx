// Step 7 of the builder — the last one. A go-live checklist, the live link,
// an (optional, simulated) custom domain, a five-tile share row and SEO/social
// settings, plus the full-width `StorefrontPreview` the frame shows underneath
// all of it. The footer's "Publish Now" button lives in `builder-shell.tsx`,
// but this step owns its behaviour: `index.tsx` reads `goLiveReady(draft)` and
// this file's own dispatch of `patchPublish` to decide what the button does
// and whether it may be pressed at all — see the report on task 21 for the
// exact shape of that hook.
//
// Drawn to the Figma frame "Public Link-step 6-publish": three columns of 12px
// panels (checklist / link + domain + share / SEO & Social) over the preview.
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import clsx from "clsx";
import { History } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { PreviewDevice } from "@/widgets/storefront-preview";
import { readLogoFile } from "@/pages/onboarding/_shared/logo-file";
import { describePublicLinkError, type PublicLinkSync } from "@/entities/site-draft";
import { GO_LIVE_ITEMS, goLiveReady } from "../_shared/checklist";
import { previewModelFromSite } from "../_shared/preview-model";
import { siteHref } from "../_shared/site-href";
import { SitePreview } from "../ui/site-preview";
import { QrCode } from "../ui/qr-code";
import { SitePreviewModal } from "../ui/site-preview-modal";
import { PublicLinkVersionsModal } from "../ui/versions-modal";
import type { SiteAction } from "../_shared/site-draft";
import type { StepProps } from "../_shared/steps";
import { usePlText } from "../_shared/texts";
import { rules, useTouched, useValidation } from "../_shared/validation";
import { PlButton, PlField, PlFieldError, PlIcon, PlInput, PlTextarea, plPanel } from "../ui/kit";
import { Switch } from "../ui/switch";
import { MediaLibraryButton } from "./connected/media-library";
import { ReviewCard } from "./connected/review-card";

const COPY_RESET_MS = 2000;

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 160;
const SLUG_MIN = 3;
const SLUG_MAX = 63;
const HOST_MAX = 253;
const SOCIAL_IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp"];
const SOCIAL_IMAGE_MAX_MB = 5;

const WHATSAPP_ICON = new URL("../../../../../assets/PublicLink/publish-whatsapp.svg", import.meta.url).href;

/** The frame's column panel: 12px radius, 12/16 padding, 16px between blocks. */
const CARD = clsx(plPanel, "flex min-w-0 flex-col gap-4 px-3 py-4");

/** The 32px "_Button base" of the link card (4px radius, 14px medium). */
const MINI =
  "inline-flex h-8 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[4px] p-2 text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50";
const MINI_PLAIN = "border border-[var(--pl-g200)] bg-[var(--pl-surface)] text-[var(--pl-text)] hover:bg-[var(--pl-g50)]";
const MINI_MUTED = "border border-[var(--pl-g200)] bg-[var(--pl-surface)] text-[var(--pl-text-2)] hover:bg-[var(--pl-g50)]";
const MINI_OUTLINE = "border border-[var(--pl-primary)] bg-[var(--pl-surface)] text-[var(--pl-primary)] hover:bg-[var(--pl-primary-soft)]";
const MINI_SOFT = "bg-[var(--pl-primary-soft)] text-[var(--pl-primary)] hover:brightness-[0.98]";

/** The 30px outlined button at the foot of a share tile (10px semibold). */
const TILE_BUTTON =
  "flex h-[30px] w-full items-center justify-center whitespace-nowrap rounded-[4px] border border-[var(--pl-primary)] bg-[var(--pl-surface)] p-2 text-[10px] font-semibold leading-[10px] text-[var(--pl-primary)] transition-colors hover:bg-[var(--pl-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

/** A panel's heading: 14px title over a 12px muted line, 8px apart. */
function CardHeader({ title, note, aside }: { title: string; note: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2 font-medium">
        <p className="text-[14px] leading-[14px] text-[var(--pl-text)]">{title}</p>
        <p className="text-[12px] leading-[1.3] text-[var(--pl-text-2)]">{note}</p>
      </div>
      {aside}
    </div>
  );
}

/** The frame's green pill ("Live", "Connected", "Primary", "Active"). Both
 *  colours are literal: the pill is light in either theme. */
function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#dcffef] px-2 py-1 text-[12px] font-medium leading-[12px] text-[#009a39]">
      <span className="size-[5px] rounded-full bg-[#009a39]" />
      {children}
    </span>
  );
}

/** Module scope, not nested inside `PublishStep`: a component redefined on
 *  every render would remount every row, which is exactly the kind of churn
 *  that drops focus mid-interaction elsewhere on a long page like this one. */
function ChecklistItemRow({
  label,
  note,
  done,
  fixLabel,
  onFix,
}: {
  label: string;
  note: string;
  done: boolean;
  fixLabel: string;
  onFix?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <PlIcon name="publish-completed-solid" className="text-[var(--pl-primary)]" />
      ) : (
        <span aria-hidden className="size-6 shrink-0 rounded-full border-2 border-[var(--pl-g300)]" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 font-medium">
        <span className="text-[14px] leading-[14px] text-[var(--pl-text)]">{label}</span>
        <span className="text-[12px] leading-[1.2] text-[var(--pl-text-2)]">{note}</span>
      </div>
      {!done && onFix && (
        <button
          type="button"
          onClick={onFix}
          className="shrink-0 rounded-[4px] px-2 py-1 text-[12px] font-semibold leading-[12px] text-[var(--pl-primary)] hover:bg-[var(--pl-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
        >
          {fixLabel}
        </button>
      )}
    </div>
  );
}

/** Rows the frame words itself ("All pages are published" / "12 pages"). */
const FRAME_ROWS: ReadonlySet<string> = new Set(["pages", "navigation", "menu", "reservations", "waitlist", "payments", "responsive", "seo", "analytics"]);
/** Rows with no setting behind them: connected to a real site, the frame's
 *  note ("Moyasar (Test Mode)") would state something nobody configured, so
 *  the neutral note stays. */
const MOCK_ROWS: ReadonlySet<string> = new Set(["payments", "analytics"]);

/** Where each incomplete checklist row sends the merchant. Rows with no
 *  setting of their own (payments, responsive, analytics) have no entry. */
function fixActionFor(id: string, dispatch: (action: SiteAction) => void, focusSeo: () => void, connected = false): (() => void) | undefined {
  // Connected, menu/reservations are added as module pages or bound sections (Pages step).
  if (connected && (id === "menu" || id === "reservations")) return () => dispatch({ type: "goTo", step: 3 });
  switch (id) {
    case "address":
      return () => dispatch({ type: "goTo", step: 2 });
    case "pages":
      return () => dispatch({ type: "goTo", step: 3 });
    case "navigation":
      return () => dispatch({ type: "goTo", step: 4 });
    case "menu":
    case "reservations":
    case "waitlist":
      return () => {
        dispatch({ type: "selectSection", id });
        dispatch({ type: "goTo", step: 5 });
      };
    case "seo":
      return focusSeo;
    default:
      return undefined;
  }
}

/** One of the five share tiles: a title, a note, a 51×50 picture and its
 *  action — module scope for the same remount-avoidance reason as
 *  `ChecklistItemRow`. */
function ShareTile({ picture, label, note, action }: { picture: ReactNode; label: string; note: string; action: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-[12px] border border-[var(--pl-g300)] p-2 text-center">
      <div className="flex w-full flex-col items-center gap-1">
        <span className="max-w-full truncate text-[12px] font-semibold leading-[12px] text-[var(--pl-text)]">{label}</span>
        <span className="max-w-full truncate text-[10px] font-normal leading-[10px] text-[var(--pl-text-3)]">{note}</span>
      </div>
      {picture}
      <span className="mt-auto w-full">{action}</span>
    </div>
  );
}

/** The tinted 51×50 box a share tile's icon sits in. */
function TilePicture({ className, children }: { className: string; children: ReactNode }) {
  return <span className={clsx("grid h-[50px] w-[51px] shrink-0 place-items-center overflow-hidden rounded-[4px]", className)}>{children}</span>;
}

/** The "Edit" form of the link card: the public address (slug). Checked for
 *  shape here and for availability by the server before it is claimed. */
function AddressEditor({ slug, sync, onClose }: { slug: string; sync: PublicLinkSync; onClose: () => void }) {
  const { locale } = useI18n();
  const tx = usePlText();
  const { check } = useValidation();
  const { touched, touch } = useTouched();
  const inputId = useId();
  const [value, setValue] = useState(slug);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string>();

  const shapeError = check(value, [rules.required(), rules.slug(), rules.minLength(SLUG_MIN), rules.maxLength(SLUG_MAX)]);
  const error = touched("slug") ? shapeError ?? serverError : undefined;

  async function save() {
    touch("slug");
    if (shapeError) return;
    if (value === slug) {
      onClose();
      return;
    }
    setBusy(true);
    setServerError(undefined);
    try {
      const availability = await sync.checkSlug(value);
      if (!availability.isAvailable) {
        setServerError(availability.reason ?? tx("pl.publish.addressTaken"));
        return;
      }
      await sync.claimSlug(value);
      onClose();
    } catch (err) {
      setServerError(describePublicLinkError(err, locale));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <PlField label={<label htmlFor={inputId}>{tx("pl.publish.address")}</label>} required hint={tx("pl.publish.addressHint")} error={error}>
        <div className="flex flex-wrap items-center gap-2">
          <div dir="ltr" className="flex min-w-[180px] flex-1 items-center gap-2">
            <PlInput
              id={inputId}
              autoFocus
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              value={value}
              invalid={Boolean(error)}
              onChange={(e) => {
                setValue(e.target.value.trim().toLowerCase());
                setServerError(undefined);
              }}
              onBlur={() => touch("slug")}
            />
            <span className="shrink-0 text-[14px] font-medium leading-[14px] text-[var(--pl-text-2)]">.octopus.app</span>
          </div>
          <PlButton type="submit" size="xs" disabled={busy}>
            {busy ? tx("pl.common.saving") : tx("pl.common.save")}
          </PlButton>
          <PlButton size="xs" variant="neutral" onClick={onClose} disabled={busy}>
            {tx("pl.common.cancel")}
          </PlButton>
        </div>
      </PlField>
    </form>
  );
}

/** A 12px label over its control, then the error (and a trailing counter). */
function SeoField({
  label,
  htmlFor,
  required,
  error,
  errorId,
  aside,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  errorId?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[12px] font-medium leading-[12px] text-[var(--pl-text)]">
        {label}
        {required && <span className="text-[var(--pl-error)]"> *</span>}
      </label>
      {children}
      {(error || aside) && (
        <div className="flex items-start justify-between gap-2">
          <PlFieldError id={errorId}>{error}</PlFieldError>
          {aside && <span className="ms-auto shrink-0">{aside}</span>}
        </div>
      )}
    </div>
  );
}

export function PublishStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t, locale } = useI18n();
  const tx = usePlText();
  const { check } = useValidation();
  const seoTouched = useTouched();
  const hostTouched = useTouched();
  const model = previewModelFromSite(draft, "desktop", t, locale);
  // The claimed address (server hostname / slug), never the business name — see preview-model.ts.
  const liveUrl = `https://${model.url}`;
  const menuUrl = `${liveUrl}/menu`;
  const connected = publicLinkSync.connected;
  const published = draft.publish.published;

  const [copiedLive, setCopiedLive] = useState(false);
  const [copiedMenu, setCopiedMenu] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [siteView, setSiteView] = useState<PreviewDevice | null>(null);
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [imageProblem, setImageProblem] = useState<"type" | "size" | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const socialImageRef = useRef<HTMLInputElement>(null);
  const seoTitleRef = useRef<HTMLInputElement>(null);
  const seoCardRef = useRef<HTMLDivElement>(null);
  const fieldId = useId();

  /** SEO Basics needs both a title and a description, so Fix lands on
   *  whichever of the two is still empty. */
  function focusSeo() {
    seoTouched.touchAll();
    const fields = Array.from(seoCardRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input:not([type=file]), textarea") ?? []);
    const target = fields.find((field) => field.value.trim() === "") ?? seoTitleRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  const { seo, customDomain } = draft.publish;
  const embedSnippet = `<iframe src="${liveUrl}" width="100%" height="640" style="border:0" title="${model.businessName}"></iframe>`;

  // ---- Custom domain: typed locally, written to the draft only by "Connect".
  const [hostDraft, setHostDraft] = useState(customDomain.host);
  const [editingHost, setEditingHost] = useState(false);
  // Follows the draft when it changes underneath (restored version, reload).
  useEffect(() => setHostDraft(customDomain.host), [customDomain.host]);
  const hostRules = [rules.hostname(), rules.maxLength(HOST_MAX)];
  // A host stored before this check existed may be half-typed: never badge it.
  const storedHostError = check(customDomain.host, hostRules);
  const hostSet = customDomain.host.trim() !== "" && !storedHostError;
  const showHostForm = !hostSet || editingHost;
  const hostFormatError = check(hostDraft, hostRules);
  const hostError = hostTouched.touched("submit")
    ? check(hostDraft, [rules.required(), ...hostRules])
    : hostTouched.touched("host") || storedHostError
      ? hostFormatError
      : undefined;

  function connectHost() {
    hostTouched.touch("submit");
    if (check(hostDraft, [rules.required(), ...hostRules])) return;
    const host = hostDraft.trim();
    dispatch({ type: "patchPublish", patch: { customDomain: { host, connected: true, ssl: true } } });
    setEditingHost(false);
    hostTouched.reset();
  }

  function removeHost() {
    dispatch({ type: "patchPublish", patch: { customDomain: { host: "", connected: false, ssl: false } } });
    setHostDraft("");
    setEditingHost(false);
    hostTouched.reset();
  }

  // ---- SEO: a length overrun shows at once, "required" once the field is left.
  const titleError = check(seo.title, seoTouched.touched("title") ? [rules.required(), rules.maxLength(SEO_TITLE_MAX)] : [rules.maxLength(SEO_TITLE_MAX)]);
  const descriptionError = check(seo.description, [rules.maxLength(SEO_DESCRIPTION_MAX)]);
  const imageError =
    imageProblem === "type"
      ? tx("pl.v.fileType", { types: tx("pl.publish.imageTypes") })
      : imageProblem === "size"
        ? tx("pl.v.fileSize", { max: SOCIAL_IMAGE_MAX_MB })
        : undefined;

  function handleSocialImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared so picking the same file again (after a rejection) fires a change.
    e.target.value = "";
    if (!file) return;
    if (!SOCIAL_IMAGE_TYPES.includes(file.type)) return setImageProblem("type");
    if (file.size > SOCIAL_IMAGE_MAX_MB * 1024 * 1024) return setImageProblem("size");
    setImageProblem(null);
    readLogoFile(file, (dataUrl) => dispatch({ type: "patchPublish", patch: { seo: { ...seo, socialImageDataUrl: dataUrl } } }));
  }

  async function copyText(value: string, onDone: (ok: boolean) => void) {
    try {
      await navigator.clipboard.writeText(value);
      onDone(true);
      setTimeout(() => onDone(false), COPY_RESET_MS);
    } catch {
      // Clipboard access can be unavailable (plain http, a browser that
      // blocks it, or a sandboxed preview) — the copy simply doesn't happen.
    }
  }

  function handleDownloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr-code.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  const pageCount = draft.remote ? draft.remote.visiblePages : draft.pages.filter((page) => page.onHome).length;
  const titleId = `${fieldId}-title`;
  const descriptionId = `${fieldId}-description`;
  const hostId = `${fieldId}-host`;

  return (
    <div className="flex flex-col gap-6">
      {published && (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#009A39]/20 bg-[var(--pl-success-soft)] px-3 py-2">
          <StatusBadge>{t("publicLink.published")}</StatusBadge>
          {draft.publish.publishedAt !== null && (
            <span className="text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)]">
              {t("publicLink.publishedOn").replace(
                "{date}",
                new Date(draft.publish.publishedAt).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              )}
            </span>
          )}
          <PlButton size="xs" variant="plain" onClick={() => setVersionsOpen(true)} className="ms-auto bg-[var(--pl-surface)]">
            <History size={14} />
            {t("publicLink.versions.open")}
          </PlButton>
          <PlButton
            size="xs"
            variant="dangerSoft"
            // The sync hook reports a failure in the builder's banner; never leave the rejection unhandled.
            onClick={() => void publicLinkSync.unpublish().catch(() => undefined)}
          >
            {t("publicLink.unpublish")}
          </PlButton>
        </div>
      )}

      <PublicLinkVersionsModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        listVersions={publicLinkSync.listVersions}
        getVersion={publicLinkSync.getVersion}
        onRestore={publicLinkSync.restoreVersion}
        onRollback={publicLinkSync.rollbackVersion}
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,269fr)_minmax(0,519fr)] min-[1400px]:grid-cols-[minmax(0,269fr)_minmax(0,519fr)_minmax(0,312fr)]">
        {/* 1- Go-live checklist */}
        <div className={CARD}>
          <CardHeader title={tx("pl.publish.checklistTitle")} note={goLiveReady(draft) ? tx("pl.publish.checklistReady") : tx("pl.publish.checklistPending")} />
          <div className="flex flex-col gap-4">
            {GO_LIVE_ITEMS.filter((item) => !item.hidden?.(draft)).map((item) => {
              const done = item.done(draft);
              const framed = FRAME_ROWS.has(item.id);
              const frameNote = done && framed && !(connected && MOCK_ROWS.has(item.id));
              return (
                <ChecklistItemRow
                  key={item.id}
                  label={framed ? tx(`pl.publish.check.${item.id}.label`) : tx(item.labelKey)}
                  note={frameNote ? tx(`pl.publish.check.${item.id}.note`, { n: pageCount }) : tx(item.noteKey)}
                  done={done}
                  fixLabel={t("publicLink.fix")}
                  onFix={fixActionFor(item.id, dispatch, focusSeo, connected)}
                />
              );
            })}
          </div>
        </div>

        {/* 2- Public link, custom domain, share */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className={CARD}>
            <CardHeader title={tx("pl.publish.linkTitle")} note={published ? tx("pl.publish.linkLive") : t("publicLink.publicLinkNote")} />
            <div className="flex flex-col gap-3">
              <p className="text-[14px] font-medium leading-[14px] text-[var(--pl-text)]">{tx("pl.publish.liveUrl")}</p>
              <div className="flex items-center justify-between gap-2 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-primary-soft)] px-3 py-2">
                <a
                  href={siteHref(liveUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="min-w-0 truncate py-[3px] text-start text-[14px] font-semibold leading-[14px] text-[var(--pl-primary)] underline"
                >
                  {liveUrl}
                </a>
                {published && <StatusBadge>{t("publicLink.live")}</StatusBadge>}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button type="button" onClick={() => setSiteView("mobile")} className={clsx(MINI, MINI_MUTED)}>
                  {tx("pl.publish.visitAsCustomer")}
                </button>
                {/* Live: the real site in a new tab. Not yet published there is nothing to open, so the preview stands in. */}
                {published ? (
                  <a href={siteHref(liveUrl)} target="_blank" rel="noopener noreferrer" className={clsx(MINI, MINI_PLAIN)}>
                    <PlIcon name="publish-open" size={16} />
                    {t("publicLink.openWebsite")}
                  </a>
                ) : (
                  <button type="button" onClick={() => setSiteView("desktop")} className={clsx(MINI, MINI_PLAIN)}>
                    <PlIcon name="publish-open" size={16} />
                    {t("publicLink.openWebsite")}
                  </button>
                )}
                <button
                  type="button"
                  aria-expanded={editingAddress}
                  onClick={() => setEditingAddress((open) => !open)}
                  className={clsx(MINI, MINI_OUTLINE)}
                >
                  <PlIcon name="publish-edit" size={16} />
                  {tx("pl.publish.edit")}
                </button>
                <button type="button" onClick={() => copyText(liveUrl, setCopiedLive)} className={clsx(MINI, MINI_SOFT)}>
                  <PlIcon name="publish-copy" size={16} />
                  <span aria-live="polite">{copiedLive ? t("publicLink.preview.copied") : t("publicLink.copyLink")}</span>
                </button>
              </div>
              {editingAddress && <AddressEditor slug={draft.slug} sync={publicLinkSync} onClose={() => setEditingAddress(false)} />}

              {/* Menu link: the site's own /menu page (not in the frame; kept as one compact row). */}
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--pl-g200)] pt-3">
                <span className="shrink-0 text-[12px] font-medium leading-[12px] text-[var(--pl-text)]" title={t("publicLink.menuLinkNote")}>
                  {t("publicLink.menuLink")}
                </span>
                <a
                  href={siteHref(liveUrl, "/menu")}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="min-w-0 flex-1 truncate text-start text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)] hover:text-[var(--pl-primary)] hover:underline"
                >
                  {menuUrl}
                </a>
                <button
                  type="button"
                  onClick={() => copyText(menuUrl, setCopiedMenu)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-[4px] px-1 py-1 text-[12px] font-medium leading-[12px] text-[var(--pl-primary)] hover:bg-[var(--pl-primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
                >
                  <PlIcon name="publish-copy" size={12} />
                  <span aria-live="polite">{copiedMenu ? t("publicLink.preview.copied") : t("publicLink.copyLink")}</span>
                </button>
                <a
                  href={siteHref(liveUrl, "/menu")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-[4px] px-1 py-1 text-[12px] font-medium leading-[12px] text-[var(--pl-text)] hover:bg-[var(--pl-g50)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
                >
                  <PlIcon name="publish-open" size={12} />
                  {t("publicLink.openMenu")}
                </a>
              </div>
            </div>
          </div>

          {/* Custom domain */}
          <div className={CARD}>
            <CardHeader
              title={tx("pl.publish.domainTitle")}
              note={tx("pl.publish.domainNote")}
              aside={hostSet ? <StatusBadge>{t("publicLink.domainConnected")}</StatusBadge> : undefined}
            />
            {showHostForm && (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  connectHost();
                }}
              >
                <PlField label={<label htmlFor={hostId}>{tx("pl.publish.domainField")}</label>} error={hostError}>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[180px] flex-1">
                      <PlInput
                        id={hostId}
                        dir="ltr"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="www.your-restaurant.com"
                        value={hostDraft}
                        invalid={Boolean(hostError)}
                        onChange={(e) => setHostDraft(e.target.value.trim())}
                        onBlur={() => hostTouched.touch("host")}
                      />
                    </div>
                    <PlButton type="submit" size="md" disabled={Boolean(hostFormatError)}>
                      {tx("pl.publish.domainConnect")}
                    </PlButton>
                    {hostSet && (
                      <PlButton
                        size="md"
                        variant="neutral"
                        onClick={() => {
                          setHostDraft(customDomain.host);
                          setEditingHost(false);
                          hostTouched.reset();
                        }}
                      >
                        {tx("pl.common.cancel")}
                      </PlButton>
                    )}
                  </div>
                </PlField>
              </form>
            )}
            <div className="flex flex-col gap-2 rounded-[12px] border border-[var(--pl-g300)] bg-[var(--pl-g50)] px-3 py-2">
              {hostSet && (
                <div className="flex items-center justify-between gap-2 border-b border-[var(--pl-g300)] pb-3">
                  <span dir="ltr" className="min-w-0 truncate py-[3px] text-start text-[14px] font-semibold leading-[14px] text-[var(--pl-text)]">
                    {customDomain.host}
                  </span>
                  <StatusBadge>{t("publicLink.primary")}</StatusBadge>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-1 text-[var(--pl-text)]">
                    <PlIcon name="publish-lock" size={16} />
                    <span className="text-[14px] font-semibold leading-[14px]">{t("publicLink.sslCertificate")}</span>
                  </div>
                  <p className="text-[12px] font-medium leading-[1.3] text-[var(--pl-text-2)]">{hostSet ? tx("pl.publish.sslNote") : tx("pl.publish.sslPending")}</p>
                </div>
                {hostSet ? <StatusBadge>{tx("pl.publish.sslActive")}</StatusBadge> : <span className="text-[12px] leading-[20px] text-[var(--pl-text-3)]">—</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] font-normal leading-[1.4] text-[var(--pl-text-3)]">{t("publicLink.mockNote")}</p>
              {hostSet && !editingHost && (
                <div className="flex items-center gap-2">
                  <PlButton size="xs" variant="outline" onClick={() => setEditingHost(true)}>
                    {tx("pl.publish.domainChange")}
                  </PlButton>
                  <PlButton size="xs" variant="dangerSoft" onClick={removeHost}>
                    {tx("pl.common.remove")}
                  </PlButton>
                </div>
              )}
            </div>
          </div>

          {/* Share your link */}
          <div className={CARD}>
            <CardHeader title={tx("pl.publish.shareTitle")} note={tx("pl.publish.shareNote")} />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(91px,1fr))] gap-[10px]">
              <ShareTile
                label={t("publicLink.qrCode")}
                note={t("publicLink.scanToOpen")}
                picture={
                  <div ref={qrRef} className="grid h-[50px] w-[51px] shrink-0 place-items-center">
                    <QrCode value={liveUrl} size={50} />
                  </div>
                }
                action={
                  <button type="button" onClick={handleDownloadQr} className={TILE_BUTTON}>
                    {t("publicLink.download")}
                  </button>
                }
              />
              <ShareTile
                label={t("publicLink.whatsapp")}
                note={t("publicLink.shareLink")}
                picture={
                  <TilePicture className="bg-[#f4fffa]">
                    <img src={WHATSAPP_ICON} alt="" width={24} height={24} className="size-6" />
                  </TilePicture>
                }
                action={
                  <a href={`https://wa.me/?text=${encodeURIComponent(liveUrl)}`} target="_blank" rel="noreferrer" className={TILE_BUTTON}>
                    {t("publicLink.share")}
                  </a>
                }
              />
              <ShareTile
                label={t("publicLink.emailShare")}
                note={t("publicLink.sendByEmail")}
                picture={
                  <TilePicture className="bg-[var(--pl-info-bg)] text-[var(--pl-primary-deep)]">
                    <PlIcon name="publish-sms" size={24} />
                  </TilePicture>
                }
                action={
                  <a href={`mailto:?subject=${encodeURIComponent(model.businessName)}&body=${encodeURIComponent(liveUrl)}`} className={TILE_BUTTON}>
                    {t("publicLink.send")}
                  </a>
                }
              />
              <ShareTile
                label={t("publicLink.socialMedia")}
                note={tx("pl.publish.shareWith")}
                picture={
                  <TilePicture className="bg-[#f5f0ff] text-[#260072]">
                    <PlIcon name="publish-share" size={32} />
                  </TilePicture>
                }
                action={
                  <button type="button" onClick={() => copyText(liveUrl, setCopiedSocial)} className={TILE_BUTTON}>
                    <span aria-live="polite">{copiedSocial ? t("publicLink.preview.copied") : t("publicLink.share")}</span>
                  </button>
                }
              />
              <ShareTile
                label={t("publicLink.embed")}
                note={tx("pl.publish.addToSite")}
                picture={
                  <TilePicture className="bg-[var(--pl-g100)] text-[var(--pl-text)]">
                    <PlIcon name="publish-embed" size={32} />
                  </TilePicture>
                }
                action={
                  <button type="button" onClick={() => setEmbedOpen(true)} className={TILE_BUTTON}>
                    {t("publicLink.getCode")}
                  </button>
                }
              />
            </div>
          </div>
        </div>

        {/* SEO & social */}
        <div ref={seoCardRef} className={clsx(CARD, "md:col-span-2 min-[1400px]:col-span-1")}>
          <CardHeader
            title={tx("pl.publish.seoTitle")}
            note={
              <>
                {tx("pl.publish.seoNote")}
                {connected && seo.title.trim() && <span className="mt-1 block">{tx("pl.seo.titleFormat", { title: seo.title.trim() })}</span>}
              </>
            }
          />
          <SeoField
            label={t("publicLink.siteTitle")}
            htmlFor={titleId}
            required
            error={titleError}
            errorId={`${titleId}-error`}
          >
            <PlInput
              ref={seoTitleRef}
              id={titleId}
              className="px-2 font-normal"
              value={seo.title}
              invalid={Boolean(titleError)}
              aria-required
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              onChange={(e) => dispatch({ type: "patchPublish", patch: { seo: { ...seo, title: e.target.value } } })}
              onBlur={() => seoTouched.touch("title")}
            />
          </SeoField>
          <SeoField
            label={t("publicLink.metaDescription")}
            htmlFor={descriptionId}
            error={descriptionError}
            errorId={`${descriptionId}-error`}
            aside={
              <span className={clsx("text-[12px] leading-[1.4]", seo.description.length > SEO_DESCRIPTION_MAX ? "text-[var(--pl-error)]" : "text-[var(--pl-text-3)]")}>
                {seo.description.length}/{SEO_DESCRIPTION_MAX}
              </span>
            }
          >
            <PlTextarea
              id={descriptionId}
              className="h-[125px] px-2 py-2 font-normal"
              placeholder={tx("pl.publish.metaPlaceholder")}
              value={seo.description}
              invalid={Boolean(descriptionError)}
              aria-describedby={descriptionError ? `${descriptionId}-error` : undefined}
              onChange={(e) => dispatch({ type: "patchPublish", patch: { seo: { ...seo, description: e.target.value } } })}
            />
          </SeoField>
          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium leading-[12px] text-[var(--pl-text)]">{t("publicLink.socialImage")}</span>
            <div className="flex flex-col gap-3">
              <div
                className={clsx(
                  "flex h-[89px] w-full flex-col justify-center rounded-[12px] border border-dashed p-2",
                  imageError ? "border-[var(--pl-error)]" : "border-[var(--pl-g300)]"
                )}
              >
                {seo.socialImageDataUrl ? (
                  <img src={seo.socialImageDataUrl} alt="" className="min-h-0 w-full flex-1 rounded-[12px] object-cover shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)]" />
                ) : (
                  <span className="grid min-h-0 w-full flex-1 place-items-center rounded-[12px] bg-[var(--pl-g100)] text-[12px] font-medium text-[var(--pl-text-3)]">
                    {tx("pl.publish.imageTypes")}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {imageError ? (
                  <PlFieldError id={`${fieldId}-image-error`}>{imageError}</PlFieldError>
                ) : (
                  <p className="text-[12px] font-normal leading-[1.4] text-[var(--pl-text-3)]">{t("publicLink.socialImageHint")}</p>
                )}
                <input
                  ref={socialImageRef}
                  type="file"
                  accept={SOCIAL_IMAGE_TYPES.join(",")}
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={handleSocialImage}
                />
                <PlButton
                  variant="outline"
                  size="md"
                  className="w-full"
                  aria-describedby={imageError ? `${fieldId}-image-error` : undefined}
                  onClick={() => socialImageRef.current?.click()}
                >
                  {t("publicLink.changeImage")}
                </PlButton>
                {connected && (
                  <MediaLibraryButton
                    sync={publicLinkSync}
                    purposes={["SocialImage"]}
                    kind="image"
                    className="w-full justify-center"
                    onPick={(picked) => {
                      setImageProblem(null);
                      dispatch({ type: "patchPublish", patch: { seo: { ...seo, socialImageDataUrl: picked.url } } });
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {connected && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium leading-[1.3] text-[var(--pl-text)]">{tx("pl.seo.hideFromSearch")}</span>
              <Switch
                checked={seo.hideFromSearch ?? false}
                onChange={() => dispatch({ type: "patchPublish", patch: { seo: { ...seo, hideFromSearch: !(seo.hideFromSearch ?? false) } } })}
                label={tx("pl.seo.hideFromSearch")}
              />
            </div>
          )}
        </div>
      </div>

      {connected && <ReviewCard sync={publicLinkSync} />}

      <SitePreview
        draft={draft}
        dispatch={dispatch}
        sync={publicLinkSync}
        device={previewDevice}
        onDevice={setPreviewDevice}
        devices={["desktop", "tablet", "mobile"]}
        title={t("publicLink.livePreview")}
        paged
        withLanguage
        height={640}
      />

      <SitePreviewModal
        open={siteView !== null}
        onClose={() => setSiteView(null)}
        draft={draft}
        dispatch={dispatch}
        sync={publicLinkSync}
        initialDevice={siteView ?? "desktop"}
      />

      <Modal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        title={t("publicLink.embed")}
        footer={
          <PlButton size="sm" onClick={() => copyText(embedSnippet, setCopiedEmbed)}>
            <PlIcon name="publish-copy" size={16} />
            <span aria-live="polite">{copiedEmbed ? t("publicLink.preview.copied") : t("publicLink.copyLink")}</span>
          </PlButton>
        }
      >
        <PlTextarea readOnly dir="ltr" rows={4} value={embedSnippet} aria-label={t("publicLink.embed")} className="font-mono text-[12px]" onFocus={(e) => e.target.select()} />
      </Modal>
    </div>
  );
}
