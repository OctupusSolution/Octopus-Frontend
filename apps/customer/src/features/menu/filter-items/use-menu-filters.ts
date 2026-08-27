"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { parseFilters, type MenuFilters } from "@/shared/lib/storefront";

/** Filter state lives in the URL, not in a useState: that keeps the listing
 *  shareable, server-rendered, and navigable with the browser's back button. */
export function useMenuFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: MenuFilters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /** Toggles one value inside a comma-separated multi-value parameter. */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const current = (searchParams.get(key) ?? "").split(",").filter(Boolean);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setParam(key, next.join(","));
    },
    [searchParams, setParam],
  );

  const clear = useCallback(
    () => router.replace(pathname, { scroll: false }),
    [pathname, router],
  );

  return { filters, setParam, toggleInList, clear };
}
