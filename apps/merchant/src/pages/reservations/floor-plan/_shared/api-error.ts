import { ApiError } from "@octopus/api-client";
import type { AdminT } from "./admin-text";

/** A readable line for a failed call: the server's own detail when it sent
 *  one, a plain "someone else changed this" for a concurrency 409. */
export function errorText(err: unknown, t: AdminT): string {
  if (err instanceof ApiError) {
    if (err.status === 409 && /concurrency|version/i.test(err.problem?.errorCode ?? "")) return t("conflict");
    return err.problem?.detail ?? err.problem?.title ?? err.problem?.errorCode ?? t("common.failed");
  }
  return err instanceof Error && err.message ? err.message : t("common.failed");
}

export const idempotencyKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
