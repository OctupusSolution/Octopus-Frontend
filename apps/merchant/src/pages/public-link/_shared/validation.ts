// Input rules shared by every step of the builder. A rule answers with a text
// key (plus the values its message interpolates) or null when the value is
// fine; `useValidation` turns that into the message a field shows under itself.
//
// Fields report an error only once they have been touched (blurred, or the
// step asked to continue) — see `useTouched` — so an empty form a merchant has
// not started yet is not painted red.
import { useCallback, useState } from "react";
import { usePlText } from "./texts";

export interface RuleFailure {
  key: string;
  vars?: Record<string, string | number>;
}

export type Rule = (value: string) => RuleFailure | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HOSTNAME = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export const rules = {
  required: (): Rule => (value) => (value.trim() ? null : { key: "pl.v.required" }),

  minLength:
    (min: number): Rule =>
    (value) =>
      value.trim() && value.trim().length < min ? { key: "pl.v.minLength", vars: { min } } : null,

  maxLength:
    (max: number): Rule =>
    (value) =>
      value.length > max ? { key: "pl.v.maxLength", vars: { max } } : null,

  email: (): Rule => (value) => (!value.trim() || EMAIL.test(value.trim()) ? null : { key: "pl.v.email" }),

  hexColor: (): Rule => (value) => (!value.trim() || HEX_COLOR.test(value.trim()) ? null : { key: "pl.v.hexColor" }),

  slug: (): Rule => (value) => (!value.trim() || SLUG.test(value.trim()) ? null : { key: "pl.v.slug" }),

  hostname: (): Rule => (value) => (!value.trim() || HOSTNAME.test(value.trim()) ? null : { key: "pl.v.hostname" }),

  /** A full http(s) address — what a CTA or social link must be. */
  url: (): Rule => (value) => {
    const text = value.trim();
    if (!text) return null;
    try {
      const parsed = new URL(text);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? null : { key: "pl.v.url" };
    } catch {
      return { key: "pl.v.url" };
    }
  },

  /** Digits only, optionally bounded. Empty passes — pair with `required`. */
  integer:
    (bounds: { min?: number; max?: number } = {}): Rule =>
    (value): RuleFailure | null => {
      const text = value.trim();
      if (!text) return null;
      if (!/^\d+$/.test(text)) return { key: "pl.v.integer" };
      const n = Number(text);
      if (bounds.min !== undefined && n < bounds.min) return { key: "pl.v.min", vars: { min: bounds.min } };
      if (bounds.max !== undefined && n > bounds.max) return { key: "pl.v.max", vars: { max: bounds.max } };
      return null;
    },

  /** A non-negative amount with up to two decimals (prices, minimum order). */
  amount:
    (bounds: { min?: number; max?: number } = {}): Rule =>
    (value): RuleFailure | null => {
      const text = value.trim();
      if (!text) return null;
      if (!/^\d+(\.\d{1,2})?$/.test(text)) return { key: "pl.v.amount" };
      const n = Number(text);
      if (bounds.min !== undefined && n < bounds.min) return { key: "pl.v.min", vars: { min: bounds.min } };
      if (bounds.max !== undefined && n > bounds.max) return { key: "pl.v.max", vars: { max: bounds.max } };
      return null;
    },
} as const;

/** The first rule a value breaks, or null. */
export function firstFailure(value: string, checks: readonly Rule[]): RuleFailure | null {
  for (const check of checks) {
    const failure = check(value);
    if (failure) return failure;
  }
  return null;
}

/** A min/max pair (party size and the like): each must be valid on its own,
 *  and min may not exceed max. Returns a failure per side. */
export function rangeFailures(
  min: string,
  max: string,
  bounds: { min?: number; max?: number } = {}
): { min: RuleFailure | null; max: RuleFailure | null } {
  const minFailure = firstFailure(min, [rules.integer(bounds)]);
  let maxFailure = firstFailure(max, [rules.integer(bounds)]);
  if (!minFailure && !maxFailure && min.trim() && max.trim() && Number(min) > Number(max)) {
    maxFailure = { key: "pl.v.rangeOrder" };
  }
  return { min: minFailure, max: maxFailure };
}

/** `check(value, [rules.required(), …])` → the translated message, or undefined. */
export function useValidation() {
  const tx = usePlText();
  const message = useCallback((failure: RuleFailure | null) => (failure ? tx(failure.key, failure.vars) : undefined), [tx]);
  const check = useCallback((value: string, checks: readonly Rule[]) => message(firstFailure(value, checks)), [message]);
  return { check, message };
}

/** Which fields a merchant has left (or been asked to review). A field shows
 *  its error only when `touched(name)` is true. */
export function useTouched() {
  const [fields, setFields] = useState<ReadonlySet<string>>(() => new Set());
  const [all, setAll] = useState(false);
  const touch = useCallback((name: string) => setFields((prev) => (prev.has(name) ? prev : new Set(prev).add(name))), []);
  const touchAll = useCallback(() => setAll(true), []);
  const reset = useCallback(() => {
    setFields(new Set());
    setAll(false);
  }, []);
  const touched = useCallback((name: string) => all || fields.has(name), [all, fields]);
  return { touched, touch, touchAll, reset };
}
