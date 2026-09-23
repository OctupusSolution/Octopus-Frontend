// Labels: the business's item tags and advisories (allergens and the like).
// Shared by Menu settings in the library and the item editor's "Manage labels".
//
// Seeded labels come from the platform with no id and no display text; they
// can be used but not renamed or deleted, so they render read-only with the
// builder's own translation of their code.
import { useState } from "react";
import clsx from "clsx";
import { Check, PencilLine, Plus, Trash2, X } from "lucide-react";
import { Button, Segmented } from "@ui/primitives";
import type { LabelKind, LabelResponse } from "@octopus/api-client";
import {
  createNamedLabel,
  describeApiError,
  invalidateMenuResource,
  labelText,
  removeLabel,
  renameLabel,
  useMenuLabels,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "./copy";

const input =
  "w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[13.5px] text-[var(--octo-text-primary)]";

/** A label's display name: its own text, else the builder's copy for the
 *  code (seeded allergens, preset tags), else the raw code. */
const PRESET_TAG_KEY: Record<string, string> = {
  "chef-recommended": "menuWiz.item.tag.chef",
  "top-selling": "menuWiz.item.tag.top",
  "most-ordered": "menuWiz.item.tag.most",
  "healthy-choice": "menuWiz.item.tag.healthy",
};

export function useLabelName() {
  const { t, locale } = useI18n();
  return (label: Pick<LabelResponse, "code" | "label">) => {
    const own = labelText(label as LabelResponse, locale);
    if (own) return own;
    for (const key of [`menuWiz.item.allergen.${label.code}`, PRESET_TAG_KEY[label.code] ?? `menuWiz.item.tag.${label.code}`]) {
      const text = t(key);
      if (text !== key) return text;
    }
    return label.code;
  };
}

function LabelRow({ label, onError }: { label: LabelResponse; onError: (msg: string | null) => void }) {
  const c = useMenuCopy();
  const nameOf = useLabelName();
  const { businessId } = useMenuLabels(false);
  const [editing, setEditing] = useState<{ en: string; ar: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const seeded = label.isSeeded || label.id === null;

  async function run(fn: () => Promise<unknown>) {
    if (!businessId) return;
    setBusy(true);
    onError(null);
    try {
      await fn();
      invalidateMenuResource("labels");
      setEditing(null);
      setConfirming(false);
    } catch (err) {
      onError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
      {editing ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            aria-label={c("labels.name")}
            className={input}
            value={editing.en}
            onChange={(e) => setEditing({ ...editing, en: e.target.value })}
          />
          <input
            aria-label={c("labels.nameAr")}
            dir="rtl"
            className={input}
            value={editing.ar}
            onChange={(e) => setEditing({ ...editing, ar: e.target.value })}
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={c("save")}
              disabled={busy || !editing.en.trim()}
              onClick={() =>
                void run(() => renameLabel(businessId!, label.id!, { en: editing.en.trim(), ar: editing.ar.trim() || editing.en.trim() }))
              }
              className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--octo-accent)] text-white disabled:opacity-50"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              aria-label={c("cancel")}
              onClick={() => setEditing(null)}
              className="grid h-9 w-9 place-items-center rounded-[8px] bg-[var(--octo-track)] text-[var(--octo-text-secondary)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-[var(--octo-text-primary)]">{nameOf(label)}</p>
            <p dir="ltr" className="truncate text-start text-[11.5px] text-[var(--octo-text-muted)]">
              {label.code}
            </p>
          </div>
          {seeded ? (
            <span className="rounded-full bg-[var(--octo-track)] px-2 py-0.5 text-[11px] font-medium text-[var(--octo-text-secondary)]">
              {c("labels.builtIn")}
            </span>
          ) : confirming ? (
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                {c("cancel")}
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={() => void run(() => removeLabel(businessId!, label.id!))}>
                {c("delete")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`${c("labels.rename")} ${nameOf(label)}`}
                onClick={() => setEditing({ en: label.label.en ?? nameOf(label), ar: label.label.ar ?? "" })}
                className="grid h-8 w-8 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <PencilLine size={15} />
              </button>
              <button
                type="button"
                aria-label={`${c("delete")} ${nameOf(label)}`}
                onClick={() => setConfirming(true)}
                className="grid h-8 w-8 place-items-center rounded-[8px] text-error hover:bg-error/10"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
      )}
      {confirming && (
        <p className="mt-2 text-[12px] text-[var(--octo-text-secondary)]">{c("labels.confirmDelete", { name: nameOf(label) })}</p>
      )}
    </li>
  );
}

export function LabelsManager({ initialKind = "ItemTag" }: { initialKind?: LabelKind }) {
  const c = useMenuCopy();
  const { t } = useI18n();
  const labels = useMenuLabels();
  const [kind, setKind] = useState<LabelKind>(initialKind);
  const [draft, setDraft] = useState({ en: "", ar: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The list endpoint returns seeded labels under every filter, so the kind is
  // split here from the full list rather than asked of the server.
  const rows = (labels.data ?? []).filter((l) => l.kind.toLowerCase() === kind.toLowerCase());

  async function create() {
    if (!labels.businessId || !draft.en.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createNamedLabel(labels.businessId, kind, { en: draft.en.trim(), ar: draft.ar.trim() || draft.en.trim() });
      invalidateMenuResource("labels");
      setDraft({ en: "", ar: "" });
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{c("labels.hint")}</p>
      <Segmented
        className="mt-3"
        value={kind}
        onChange={(v: string) => setKind(v as LabelKind)}
        options={[
          { id: "ItemTag", label: t("menuWiz.item.tags") },
          { id: "Advisory", label: t("menuWiz.item.tab.allergies") },
        ]}
      />

      {(error || labels.error) && (
        <p role="alert" className="mt-3 flex items-center justify-between gap-2 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          <span>{error ?? labels.error}</span>
          {labels.error && !error && (
            <button type="button" className="underline" onClick={labels.refresh}>
              {c("retry")}
            </button>
          )}
        </p>
      )}

      <ul className="mt-3 max-h-[42vh] space-y-2 overflow-y-auto">
        {labels.loading && !labels.data ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</li>
        ) : rows.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("labels.none")}</li>
        ) : (
          rows.map((label) => <LabelRow key={label.id ?? `seed-${label.code}`} label={label} onError={setError} />)
        )}
      </ul>

      <div className={clsx("mt-3 grid gap-2 border-t border-[var(--octo-divider)] pt-3 sm:grid-cols-[1fr_1fr_auto]")}>
        <input
          aria-label={c("labels.name")}
          placeholder={c("labels.name")}
          className={input}
          value={draft.en}
          onChange={(e) => setDraft({ ...draft, en: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <input
          aria-label={c("labels.nameAr")}
          placeholder={c("labels.nameAr")}
          dir="rtl"
          className={input}
          value={draft.ar}
          onChange={(e) => setDraft({ ...draft, ar: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && void create()}
        />
        <Button disabled={busy || !draft.en.trim()} onClick={() => void create()} icon={<Plus size={15} aria-hidden />}>
          {c("labels.create")}
        </Button>
      </div>
    </div>
  );
}
