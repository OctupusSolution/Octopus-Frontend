// Everything between "I'm done arranging" and a live floor: the review of the
// plan with a readiness checklist, the preview dialog, the confirmation, and
// the success screen.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleX, Eye, PartyPopper, Rocket, TriangleAlert, X } from "lucide-react";
import { Button, Modal } from "@ui/primitives";
import { docStats, hasBlockingIssues, validateDoc, type DocIssues, type FloorPlanDoc } from "@/entities/floor-plan";
import { PlanViewport } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { ConfirmModal } from "../../_shared/confirm-modal";
import { TextField } from "../../_shared/fields";
import { formatNumber } from "../../_shared/format";

type Level = "ok" | "warning" | "error";

function CheckRow({ level, title, detail, action }: { level: Level; title: string; detail?: string; action?: ReactNode }) {
  const Icon = level === "ok" ? CircleCheck : level === "warning" ? TriangleAlert : CircleX;
  const color = level === "ok" ? "#16A34A" : level === "warning" ? "#D97706" : "#DC2626";
  return (
    <li className="flex items-start gap-2.5 py-2">
      <Icon size={19} className="mt-px shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--octo-text-primary)]">{title}</p>
        {detail && <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-muted)]">{detail}</p>}
      </div>
      {action}
    </li>
  );
}

export function issueCounts(issues: DocIssues) {
  const blocking = hasBlockingIssues(issues);
  const warnings = [issues.overlaps.length > 0, issues.noReservable, issues.outOfBounds.length > 0].filter(Boolean).length;
  return { blocking, warnings };
}

export function PlanReview({
  doc,
  onRename,
  onShowItems,
  previewClassName = "h-[clamp(360px,58vh,660px)]",
}: {
  doc: FloorPlanDoc;
  onRename: (name: string) => void;
  onShowItems?: (ids: string[]) => void;
  previewClassName?: string;
}) {
  const { t, locale } = useI18n();
  const issues = useMemo(() => validateDoc(doc), [doc]);
  const stats = useMemo(() => docStats(doc), [doc]);
  const [name, setName] = useState(doc.name);
  useEffect(() => setName(doc.name), [doc.name]);
  const numberById = new Map(doc.tables.map((table) => [table.id, table.number]));

  const show = (ids: string[]) =>
    onShowItems && ids.length > 0 ? (
      <button type="button" onClick={() => onShowItems(ids)} className="shrink-0 rounded-md px-2 py-1 text-[12.5px] font-medium text-[#0D6EFD] hover:bg-[var(--octo-selected)]">
        {t("floorPlan.review.show")}
      </button>
    ) : undefined;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)]">
        <PlanViewport doc={doc} zoom={{ mode: "fit" }} className={previewClassName} frameClassName="rounded-md shadow-[0_2px_10px_rgba(15,23,42,0.08)]" showBackground={false} />
      </div>

      <aside className="flex flex-col gap-4 rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-5">
        <TextField
          label={t("floorPlan.review.planName")}
          value={name}
          maxLength={40}
          onChange={setName}
          onBlur={() => {
            const trimmed = name.trim();
            if (trimmed && trimmed !== doc.name) onRename(trimmed);
            else setName(doc.name);
          }}
          error={name.trim() ? undefined : t("floorPlan.review.planNameRequired")}
        />

        <dl className="grid grid-cols-2 gap-2">
          {[
            [t("floorPlan.stats.tables"), formatNumber(stats.tables, locale)],
            [t("floorPlan.stats.capacity"), t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale))],
            [t("floorPlan.stats.zones"), formatNumber(stats.zones, locale)],
            [t("floorPlan.stats.blocked"), formatNumber(stats.blocked, locale)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[var(--octo-soft-bg)] px-3 py-2">
              <dt className="text-[12px] text-[var(--octo-text-muted)]">{label}</dt>
              <dd className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("floorPlan.review.checklist")}</h3>
          <ul className="mt-1 divide-y divide-[var(--octo-divider)]">
            <CheckRow
              level={issues.noTables ? "error" : "ok"}
              title={issues.noTables ? t("floorPlan.review.noTables") : t("floorPlan.review.hasTables").replace("{n}", String(stats.tables))}
            />
            <CheckRow
              level={issues.duplicateNumbers.length || issues.emptyNumbers.length ? "error" : "ok"}
              title={issues.duplicateNumbers.length || issues.emptyNumbers.length ? t("floorPlan.review.numbersBad") : t("floorPlan.review.numbersOk")}
              detail={
                issues.duplicateNumbers.length
                  ? t("floorPlan.review.duplicates").replace("{list}", issues.duplicateNumbers.join(", "))
                  : issues.emptyNumbers.length
                    ? t("floorPlan.review.emptyNumbers").replace("{n}", String(issues.emptyNumbers.length))
                    : undefined
              }
              action={show([
                ...doc.tables.filter((table) => issues.duplicateNumbers.some((n) => n.toLowerCase() === table.number.trim().toLowerCase())).map((table) => table.id),
                ...issues.emptyNumbers,
              ])}
            />
            <CheckRow
              level={issues.overlaps.length ? "warning" : "ok"}
              title={issues.overlaps.length ? t("floorPlan.review.overlaps").replace("{n}", String(issues.overlaps.length)) : t("floorPlan.review.noOverlaps")}
              detail={issues.overlaps.length ? issues.overlaps.slice(0, 4).map(([a, b]) => `${numberById.get(a)} ↔ ${numberById.get(b)}`).join(" · ") : undefined}
              action={show(Array.from(new Set(issues.overlaps.flat())))}
            />
            <CheckRow
              level={issues.noReservable ? "warning" : "ok"}
              title={issues.noReservable ? t("floorPlan.review.noReservable") : t("floorPlan.review.reservable")}
            />
            <CheckRow
              level={issues.outOfBounds.length ? "warning" : "ok"}
              title={issues.outOfBounds.length ? t("floorPlan.review.outOfBounds").replace("{n}", String(issues.outOfBounds.length)) : t("floorPlan.review.inBounds")}
              action={show(issues.outOfBounds)}
            />
          </ul>
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-[var(--octo-selected)] p-3 text-[12.5px] leading-relaxed text-[var(--octo-text-secondary)]">
          <CircleAlert size={16} className="mt-px shrink-0 text-[#0D6EFD]" />
          {t("floorPlan.review.carryOver")}
        </p>
      </aside>
    </div>
  );
}

export function PlanPreviewModal({
  open,
  onClose,
  doc,
  onRename,
  onShowItems,
  onPublish,
  publishLabel,
}: {
  open: boolean;
  onClose: () => void;
  doc: FloorPlanDoc;
  onRename: (name: string) => void;
  onShowItems: (ids: string[]) => void;
  onPublish: () => void;
  publishLabel: string;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("floorPlan.review.previewTitle")}
        onClick={(event) => event.stopPropagation()}
        className="octo-scroll flex max-h-full w-full max-w-[1320px] flex-col overflow-y-auto rounded-[22px] bg-[var(--octo-card)] p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--octo-selected)] text-[#0D6EFD]">
              <Eye size={20} />
            </span>
            <div>
              <h2 className="text-[19px] font-bold text-[var(--octo-text-primary)]">{t("floorPlan.review.previewTitle")}</h2>
              <p className="mt-0.5 text-[13.5px] text-[var(--octo-text-secondary)]">{t("floorPlan.review.previewSubtitle")}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("floorPlan.common.close")} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">
          <PlanReview
            doc={doc}
            onRename={onRename}
            onShowItems={(ids) => {
              onClose();
              onShowItems(ids);
            }}
            previewClassName="h-[clamp(320px,56vh,620px)]"
          />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} className="h-11 justify-center px-5 text-[14px]">
            {t("floorPlan.review.backToEditing")}
          </Button>
          <Button icon={<Rocket size={16} />} onClick={onPublish} className="h-11 justify-center px-6 text-[14px]">
            {publishLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PublishConfirmModal({
  open,
  onClose,
  onConfirm,
  doc,
  replacingName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  doc: FloorPlanDoc;
  replacingName: string | null;
}) {
  const { t } = useI18n();
  const issues = useMemo(() => validateDoc(doc), [doc]);
  const { blocking, warnings } = issueCounts(issues);
  const stats = docStats(doc);

  if (blocking) {
    return (
      <ConfirmModal
        open={open}
        onClose={onClose}
        tone="danger"
        icon={<CircleX size={20} />}
        title={t("floorPlan.publish.blockedTitle")}
        body={issues.noTables ? t("floorPlan.review.noTables") : t("floorPlan.publish.blockedBody")}
        actions={[{ label: t("floorPlan.publish.fix"), onClick: onClose }]}
      />
    );
  }

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      icon={<Rocket size={20} />}
      title={t("floorPlan.publish.confirmTitle")}
      body={
        <>
          <p>
            {replacingName
              ? t("floorPlan.publish.replaceBody").replace("{name}", replacingName)
              : t("floorPlan.publish.firstBody")}
          </p>
          <p className="mt-2 font-medium text-[var(--octo-text-primary)]">
            {t("floorPlan.publish.summary").replace("{name}", doc.name).replace("{tables}", String(stats.tables)).replace("{seats}", String(stats.seats))}
          </p>
          {warnings > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[var(--octo-tone-warning-text)]">
              <TriangleAlert size={14} />
              {t("floorPlan.publish.warnings").replace("{n}", String(warnings))}
            </p>
          )}
        </>
      }
      actions={[
        { label: t("floorPlan.common.cancel"), variant: "secondary", onClick: onClose },
        { label: t("floorPlan.publish.confirm"), icon: <Rocket size={15} />, onClick: onConfirm },
      ]}
    />
  );
}

export function PublishSuccessModal({
  open,
  doc,
  onViewLive,
  onBackToBuilder,
}: {
  open: boolean;
  doc: FloorPlanDoc;
  onViewLive: () => void;
  onBackToBuilder: () => void;
}) {
  const { t } = useI18n();
  const stats = docStats(doc);
  return (
    <Modal open={open} onClose={onViewLive} className="max-w-md p-7">
      <div className="flex flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#22C55E]/12 text-[#16A34A]">
          <PartyPopper size={30} />
        </span>
        <h2 className="mt-4 text-[20px] font-bold text-[var(--octo-text-primary)]">{t("floorPlan.publish.successTitle")}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--octo-text-secondary)]">
          {t("floorPlan.publish.successBody").replace("{name}", doc.name).replace("{tables}", String(stats.tables)).replace("{seats}", String(stats.seats))}
        </p>
        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onBackToBuilder} className="h-11 flex-1 justify-center text-[14px]">
            {t("floorPlan.publish.backToBuilder")}
          </Button>
          <Button onClick={onViewLive} className="h-11 flex-1 justify-center text-[14px]">
            {t("floorPlan.publish.viewLive")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
