// Strings for the Staff screens wired to endpoints after the shared dictionaries
// (packages/i18n) were frozen for this module. Each call carries both languages
// inline, so a new label never depends on an edit to another package.
import { useCallback } from "react";
import { ApiError } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";

export type Tx = (en: string, ar: string) => string;

export function useTx(): Tx {
  const { locale } = useI18n();
  return useCallback((en: string, ar: string) => (locale === "ar" ? ar : en), [locale]);
}

/** A catalog row's name in the active language (both are always present). */
export function useLocalName(): (entry: { nameEn: string; nameAr: string } | null | undefined) => string {
  const { locale } = useI18n();
  return useCallback((entry) => (entry ? (locale === "ar" ? entry.nameAr || entry.nameEn : entry.nameEn || entry.nameAr) : ""), [locale]);
}

/** Turns the Staff API's error codes into a sentence; unknown codes fall back to the server's detail. */
export function staffErrorText(err: unknown, tx: Tx): string {
  if (err instanceof ApiError) {
    const code = err.problem?.errorCode ?? "";
    const known: Record<string, [string, string]> = {
      "staff.concurrency.stale": ["Someone else changed this first. Reload and try again.", "قام شخص آخر بالتعديل أولاً. أعد التحميل وحاول مرة أخرى."],
      "staff.catalog.name-taken": ["That name is already used (in English or Arabic).", "هذا الاسم مستخدم بالفعل (بالعربية أو الإنجليزية)."],
      "staff.catalog.in-use": ["Still assigned to members — reassign them or deactivate instead.", "ما زال مرتبطًا بموظفين — انقلهم أو عطّله بدلًا من الحذف."],
      "staff.time-off.type-name-taken": ["That leave type name is already used.", "اسم نوع الإجازة مستخدم بالفعل."],
      "staff.time-off.type-in-use": ["Requests still use this type — deactivate it instead.", "هناك طلبات تستخدم هذا النوع — عطّله بدلًا من الحذف."],
      "staff.time-off.type-inactive": ["This leave type is deactivated.", "نوع الإجازة هذا معطّل."],
      "staff.time-off.overlap": ["This overlaps time off already approved.", "يتداخل مع إجازة معتمدة مسبقًا."],
      "staff.time-off.range-invalid": ["The end date is before the start date.", "تاريخ النهاية قبل تاريخ البداية."],
      "staff.role.unknown-permission": ["Some permissions are no longer offered. Reload the matrix.", "بعض الصلاحيات لم تعد متاحة. أعد تحميل المصفوفة."],
      "staff.role.system-role-immutable": ["The Owner role cannot be changed.", "لا يمكن تعديل دور المالك."],
      "staff.role.in-use": ["Members still hold this role.", "ما زال هناك موظفون بهذا الدور."],
      "staff.role.inactive": ["This role is deactivated.", "هذا الدور معطّل."],
      "staff.role.name-taken": ["A role with this name already exists.", "يوجد دور بهذا الاسم بالفعل."],
      "staff.member.scope-widening-refused": ["You cannot give wider access than your own.", "لا يمكنك منح صلاحية وصول أوسع من صلاحيتك."],
      "staff.member.branch-required-for-scope": ["A branch is required for branch-only access.", "يلزم تحديد فرع للوصول المقتصر على الفرع."],
      "staff.member.email-required": ["Add an email address before inviting.", "أضف بريدًا إلكترونيًا قبل الدعوة."],
      "staff.member.locked": ["The account is locked — unlock it first.", "الحساب مقفل — ألغِ القفل أولًا."],
      "staff.invitation.rate-limited": ["Too many invitations sent. Try again later.", "تم إرسال دعوات كثيرة. حاول لاحقًا."],
      "staff.invitation.unavailable": ["This invitation is no longer valid.", "هذه الدعوة لم تعد صالحة."],
      "staff.schedule.range-invalid": ["That date range is too wide.", "نطاق التاريخ واسع جدًا."],
      "staff.shift.inactive": ["That shift role is deactivated.", "دور الوردية هذا معطّل."],
    };
    const hit = known[code];
    if (hit) return tx(hit[0], hit[1]);
    return err.problem?.detail ?? err.problem?.title ?? (code || err.message);
  }
  return err instanceof Error ? err.message : tx("Request failed", "فشل الطلب");
}

export const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
