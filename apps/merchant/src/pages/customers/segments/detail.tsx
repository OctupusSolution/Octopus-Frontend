// apps/merchant/src/pages/customers/segments/detail.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { actionErrorKey } from "../_shared/crm-api";
import { formatSarWhole } from "../_shared/format";
import { Toast, useToast } from "../_shared/toast";
import { ConditionsEditor } from "./conditions-editor";
import {
  formatPercent,
  membersLine,
  segmentDisplayName,
  toCriteria,
  toDrafts,
  type ConditionDraft,
  type MatchMode,
  type SegmentMemberPreview,
  type SegmentView,
} from "./segment-model";
import { segmentActions, useSegments } from "./segments-store";
import { TrendAreaChart } from "./trend-chart";

const CARD_CLASS = "rounded-[12px] border border-[#cbd5e1] bg-[var(--octo-card)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]";
const PAGE_CLASS = "px-4 pb-10 pt-6 sm:px-6 lg:ps-12 lg:pt-8";
// Long enough that typing a value does not ask the server on every keystroke.
const ESTIMATE_DELAY_MS = 300;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="truncate text-[12px] uppercase leading-[12px] text-[var(--octo-text-secondary)]">{label}</p>
      <p className="truncate pt-[2px] text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{value}</p>
    </div>
  );
}

function PreviewMembers({ members }: { members: readonly SegmentMemberPreview[] | null | undefined }) {
  const { t } = useI18n();
  if (members === undefined) return <p className="px-2 py-[9px] text-[12px] text-[var(--octo-text-secondary)]">{t("common.loading")}</p>;
  if (members === null || members.length === 0) {
    return (
      <p className="px-2 py-[9px] text-[12px] text-[var(--octo-text-secondary)]">
        {t(members === null ? "customers.segments.previewUnavailable" : "customers.segments.previewEmpty")}
      </p>
    );
  }
  const head = "px-2 py-[7px] text-[10.5px] font-semibold uppercase leading-[15.75px] tracking-[0.2625px] text-[var(--octo-text-secondary)]";
  return (
    <table className="w-full table-fixed border-collapse">
      <thead>
        <tr className="border-b border-[var(--octo-divider)]">
          <th scope="col" className={`${head} text-start`}>{t("customers.segments.col.customer")}</th>
          <th scope="col" className={`${head} text-center`}>{t("customers.segments.col.visits")}</th>
          <th scope="col" className={`${head} text-end`}>{t("customers.segments.col.totalSpent")}</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => (
          <tr key={member.id} className="border-b border-[var(--octo-divider)] text-[12px] leading-[12px] last:border-b-0">
            <td className="truncate px-2 py-[9px] text-start font-medium text-[var(--octo-text-primary)]">{member.name}</td>
            <td className="px-2 py-[9px] text-center font-medium text-[var(--octo-text-secondary)]">{member.visits.toLocaleString("en-US")}</td>
            <td className="px-2 py-[9px] text-end font-bold text-[#0d6efd]">{formatSarWhole(member.totalSpendSar)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SegmentDetails({ segment, editable }: { segment: SegmentView; editable: boolean }) {
  const { t } = useI18n();
  const [toast, showToast, toastTone] = useToast();
  const [drafts, setDrafts] = useState<ConditionDraft[]>(() => toDrafts(segment.criteria));
  const [match, setMatch] = useState<MatchMode>(segment.criteria.match);
  // undefined while loading, null when the members cannot be listed.
  const [members, setMembers] = useState<SegmentMemberPreview[] | null | undefined>(undefined);
  const [estimate, setEstimate] = useState<number | null>(null);

  const savedCriteria = JSON.stringify(segment.criteria);
  const criteria = useMemo(() => toCriteria(drafts, match), [drafts, match]);
  const criteriaJson = criteria ? JSON.stringify(criteria) : null;
  const dirty = criteriaJson !== null && criteriaJson !== savedCriteria;

  useEffect(() => {
    let cancelled = false;
    setMembers(undefined);
    segmentActions.previewMembers(JSON.parse(savedCriteria) as SegmentView["criteria"]).then(
      (rows) => !cancelled && setMembers(rows),
      (err: unknown) => {
        console.error("Loading the segment's members failed", err);
        if (!cancelled) setMembers(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [savedCriteria]);

  useEffect(() => {
    if (criteriaJson === null) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      segmentActions.estimate(JSON.parse(criteriaJson) as SegmentView["criteria"]).then(
        (count) => !cancelled && setEstimate(count),
        (err: unknown) => {
          if (cancelled) return;
          setEstimate(null);
          showToast(t(actionErrorKey(err)), "error");
        }
      );
    }, ESTIMATE_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // Keyed on the criteria alone: `t` and `showToast` changing must not ask the server again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaJson]);

  const save = () => {
    if (!criteria || !dirty) return;
    if (segmentActions.updateCriteria(segment.id, criteria)) showToast(t("customers.segments.saved"));
    else showToast(t("customers.segments.saveUnsupported"), "error");
  };

  return (
    <div className={PAGE_CLASS}>
      <header className="flex flex-col gap-3">
        <h1 className="text-[24px] font-bold leading-[24px] text-[var(--octo-text-primary)]">
          {t("customers.segments.detailTitle").replace("{name}", segmentDisplayName(segment.name, t))}
        </h1>
        <p className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t("customers.segments.subtitle")}</p>
      </header>

      <div className="mt-8 flex flex-col gap-2 rounded-[12px] bg-[#f5f9ff] p-3 [[data-theme=dark]_&]:bg-[#0d6efd]/15">
        <p className="truncate text-[24px] font-bold leading-[24px] text-[#0058da] [[data-theme=dark]_&]:text-[#0d6efd]">{segmentDisplayName(segment.name, t)}</p>
        <p className="rounded-[4px] bg-[var(--octo-card)] p-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">
          {membersLine(segment, t)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,757fr)_minmax(0,367fr)]">
        <section className={`${CARD_CLASS} min-w-0 p-4`}>
          <h2 className="text-[14px] font-bold uppercase leading-[14px] tracking-[0.63px] text-[var(--octo-text-secondary)]">
            {t("customers.segments.trend")}
          </h2>
          <div className="mt-2">
            <TrendAreaChart trend={segment.trend} />
          </div>
          <div className="mb-2 mt-4 flex items-center gap-6 rounded-[8px] border border-[var(--octo-divider)] px-4 py-2">
            <Stat label={t("customers.segments.stat.avgSpend")} value={segment.avgSpendSar === null ? "—" : formatSarWhole(segment.avgSpendSar)} />
            <Stat label={t("customers.segments.stat.members")} value={segment.members === null ? "—" : segment.members.toLocaleString("en-US")} />
            <Stat label={t("customers.segments.stat.ofBase")} value={segment.ofBasePercent === null ? "—" : `${formatPercent(segment.ofBasePercent)}%`} />
          </div>
          <h2 className="pt-5 text-[10.5px] font-semibold uppercase leading-[15.75px] tracking-[0.63px] text-[var(--octo-text-secondary)]">
            {t("customers.segments.preview")}
          </h2>
          <PreviewMembers members={members} />
        </section>

        <section className={`${CARD_CLASS} min-w-0 px-2 py-4`}>
          <h2 className="text-[24px] font-semibold leading-[24px] text-[var(--octo-text-primary)]">{t("customers.segments.conditions")}</h2>
          <div className="mt-6 flex flex-col gap-6">
            <ConditionsEditor drafts={drafts} match={match} onDraftsChange={setDrafts} onMatchChange={setMatch} />
            <p className="flex items-center gap-2 rounded-[9px] bg-[#f5f9ff] px-3 py-[10px] text-[12.5px] leading-[18.75px] text-[#0d6efd] [[data-theme=dark]_&]:bg-[#0d6efd]/15">
              <ShellIcon name="crm-seg-layers.svg" size={14} />
              <span className="font-semibold">{estimate === null ? "—" : estimate.toLocaleString("en-US")}</span>
              <span className="min-w-0 truncate">{t("customers.segments.estimated")}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            title={editable ? undefined : t("customers.segments.saveUnsupported")}
            className="mt-4 h-10 w-full rounded-[8px] bg-[#0d6efd] px-3 py-2 text-[18px] font-bold leading-[18px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("customers.segments.save")}
          </button>
        </section>
      </div>

      <Toast message={toast} tone={toastTone} />
    </div>
  );
}

export function SegmentDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const { segments, source } = useSegments();
  const segment = segments?.find((s) => s.id === id);

  if (segment) {
    // Keyed by id so the editor's rows start again from the next segment's own rules.
    return <SegmentDetails key={segment.id} segment={segment} editable={source === "mock"} />;
  }
  return (
    <div className={PAGE_CLASS}>
      <p className="text-[14px] text-[var(--octo-text-secondary)]">{t(segments === null ? "common.loading" : "customers.segments.notFound")}</p>
      {segments !== null && (
        <Link to="/customers/segments" className="mt-3 inline-block text-[14px] font-medium text-[#0d6efd] hover:underline">
          {t("customers.segments.backToList")}
        </Link>
      )}
    </div>
  );
}
