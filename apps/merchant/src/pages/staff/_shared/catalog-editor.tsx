// One bilingual list editor for the Staff catalogs that share a shape — job
// titles, departments and time-off types: { nameAr, nameEn, sortOrder,
// isActive, version }. Both names are required and each is business-unique on
// its own (409 *.name-taken); an entry still in use cannot be deleted (409
// *.in-use), so deactivating is offered beside it.
import { useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/app/providers/auth-provider";
import { buttonClass } from "./buttons";
import { TextInput } from "./form";
import { StatusPill } from "./status-pill";
import { newKey, staffErrorText, useTx } from "./text";

export interface CatalogRow {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

export interface CatalogApi {
  create: (businessId: string, body: { nameAr: string; nameEn: string; sortOrder?: number | null }, idempotencyKey: string) => Promise<unknown>;
  update: (
    businessId: string,
    id: string,
    body: { nameAr: string; nameEn: string; sortOrder?: number | null; isActive?: boolean | null; expectedVersion?: number | null }
  ) => Promise<unknown>;
  remove: (businessId: string, id: string, expectedVersion?: number) => Promise<void>;
}

const ICON_BUTTON =
  "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40";

export function CatalogEditor({
  rows,
  api,
  onChanged,
  loading,
  emptyText,
  addLabel,
}: {
  rows: readonly CatalogRow[];
  api: CatalogApi;
  /** Re-reads the list after any write. */
  onChanged: () => Promise<void>;
  loading?: boolean;
  emptyText: string;
  addLabel: string;
}) {
  const tx = useTx();
  const { activeBusinessId } = useAuth();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEn, setEditEn] = useState("");
  const [editAr, setEditAr] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (tag: string, work: (businessId: string) => Promise<unknown>) => {
    if (!activeBusinessId) return false;
    setBusy(tag);
    setError(null);
    try {
      await work(activeBusinessId);
      await onChanged();
      return true;
    } catch (err) {
      setError(staffErrorText(err, tx));
      // A stale version means the list on screen is out of date — refresh it.
      await onChanged().catch(() => undefined);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      setError(tx("Enter both the English and the Arabic name.", "أدخل الاسم بالإنجليزية والعربية."));
      return;
    }
    const nextSort = rows.reduce((max, r) => Math.max(max, r.sortOrder), 0) + 1;
    const ok = await run("add", (b) => api.create(b, { nameEn: nameEn.trim(), nameAr: nameAr.trim(), sortOrder: nextSort }, newKey()));
    if (ok) {
      setNameEn("");
      setNameAr("");
    }
  };

  const saveEdit = async (row: CatalogRow) => {
    if (!editEn.trim() || !editAr.trim()) {
      setError(tx("Enter both the English and the Arabic name.", "أدخل الاسم بالإنجليزية والعربية."));
      return;
    }
    const ok = await run(row.id, (b) =>
      api.update(b, row.id, { nameEn: editEn.trim(), nameAr: editAr.trim(), sortOrder: row.sortOrder, isActive: row.isActive, expectedVersion: row.version })
    );
    if (ok) setEditingId(null);
  };

  const setActive = (row: CatalogRow, isActive: boolean) =>
    run(row.id, (b) => api.update(b, row.id, { nameEn: row.nameEn, nameAr: row.nameAr, sortOrder: row.sortOrder, isActive, expectedVersion: row.version }));

  const remove = async (row: CatalogRow) => {
    const ok = await run(row.id, (b) => api.remove(b, row.id, row.version));
    if (ok) setConfirmDeleteId(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
        className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <TextInput
          value={nameEn}
          dir="ltr"
          onChange={(e) => setNameEn(e.target.value)}
          placeholder={tx("Name in English", "الاسم بالإنجليزية")}
          aria-label={tx("Name in English", "الاسم بالإنجليزية")}
        />
        <TextInput
          value={nameAr}
          dir="rtl"
          lang="ar"
          onChange={(e) => setNameAr(e.target.value)}
          placeholder={tx("Name in Arabic", "الاسم بالعربية")}
          aria-label={tx("Name in Arabic", "الاسم بالعربية")}
        />
        <button type="submit" disabled={busy !== null} className={buttonClass("primary", "md", "h-11")}>
          {busy === "add" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Plus size={16} aria-hidden />}
          {addLabel}
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-[9px] bg-[var(--octo-tone-danger-bg)] px-3 py-2 text-[13px] text-[var(--octo-tone-danger-text)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-8 text-[13px] text-[var(--octo-text-secondary)]">
          <Loader2 size={16} className="animate-spin" aria-hidden />
          {tx("Loading…", "جارٍ التحميل…")}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-4 py-8 text-center text-[13px] text-[var(--octo-text-secondary)]">
          {emptyText}
        </p>
      ) : (
        <ul className="octo-scroll flex max-h-[380px] flex-col overflow-y-auto rounded-[12px] border border-[var(--octo-border-card)]">
          {rows.map((row) => {
            const editing = editingId === row.id;
            const rowBusy = busy === row.id;
            return (
              <li key={row.id} className="flex flex-wrap items-center gap-2 border-b border-[var(--octo-divider)] px-3 py-2.5 last:border-b-0">
                {editing ? (
                  <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <TextInput value={editEn} dir="ltr" autoFocus onChange={(e) => setEditEn(e.target.value)} aria-label={tx("Name in English", "الاسم بالإنجليزية")} />
                    <TextInput value={editAr} dir="rtl" lang="ar" onChange={(e) => setEditAr(e.target.value)} aria-label={tx("Name in Arabic", "الاسم بالعربية")} />
                  </div>
                ) : (
                  <div className={clsx("min-w-0 flex-1", !row.isActive && "opacity-60")}>
                    <p className="truncate text-[14px] font-medium text-[var(--octo-text-primary)]" dir="ltr">{row.nameEn}</p>
                    <p className="truncate text-[13px] text-[var(--octo-text-secondary)]" dir="rtl" lang="ar">{row.nameAr}</p>
                  </div>
                )}
                {!editing && !row.isActive && <StatusPill tone="neutral" label={tx("Inactive", "غير نشط")} />}
                <div className="flex shrink-0 items-center gap-1">
                  {rowBusy && <Loader2 size={16} className="animate-spin text-[var(--octo-text-secondary)]" aria-hidden />}
                  {editing ? (
                    <>
                      <button type="button" disabled={rowBusy} onClick={() => void saveEdit(row)} className={ICON_BUTTON} aria-label={tx("Save", "حفظ")} title={tx("Save", "حفظ")}>
                        <Check size={17} />
                      </button>
                      <button type="button" disabled={rowBusy} onClick={() => setEditingId(null)} className={ICON_BUTTON} aria-label={tx("Cancel", "إلغاء")} title={tx("Cancel", "إلغاء")}>
                        <X size={17} />
                      </button>
                    </>
                  ) : confirmDeleteId === row.id ? (
                    <>
                      <span className="text-[12px] text-[var(--octo-tone-danger-text)]">{tx("Delete?", "حذف؟")}</span>
                      <button type="button" disabled={rowBusy} onClick={() => void remove(row)} className={buttonClass("danger", "sm")}>
                        {tx("Delete", "حذف")}
                      </button>
                      <button type="button" disabled={rowBusy} onClick={() => setConfirmDeleteId(null)} className={buttonClass("secondary", "sm")}>
                        {tx("Keep", "إبقاء")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void setActive(row, !row.isActive)}
                        className={buttonClass(row.isActive ? "warningSoft" : "successSoft", "sm")}
                      >
                        {row.isActive ? tx("Deactivate", "تعطيل") : tx("Activate", "تفعيل")}
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => {
                          setEditingId(row.id);
                          setEditEn(row.nameEn);
                          setEditAr(row.nameAr);
                          setError(null);
                        }}
                        className={ICON_BUTTON}
                        aria-label={tx(`Rename ${row.nameEn}`, `إعادة تسمية ${row.nameAr}`)}
                        title={tx("Rename", "إعادة تسمية")}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => setConfirmDeleteId(row.id)}
                        className={clsx(ICON_BUTTON, "hover:text-[var(--octo-tone-danger-text)]")}
                        aria-label={tx(`Delete ${row.nameEn}`, `حذف ${row.nameAr}`)}
                        title={tx("Delete", "حذف")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
