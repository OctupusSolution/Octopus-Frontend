"use client";

import { Upload, X } from "lucide-react";
import { useEffect, useRef, type ChangeEvent } from "react";
import { useI18n } from "@/app/providers";

export interface AttachedImage {
  name: string;
  size: number;
  previewUrl: string;
}

export interface AttachImageProps {
  value: AttachedImage | null;
  onChange: (next: AttachedImage | null) => void;
}

/** The preview is an object URL, revoked when it is replaced or cleared so the
 *  page does not leak one blob per attempt. Only the name and size ever leave
 *  this component — there is no upload endpoint to send the bytes to. */
export function AttachImage({ value, onChange }: AttachImageProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    urlRef.current = value?.previewUrl ?? null;
  }, [value]);

  // Revoke on unmount; swapping and clearing revoke eagerly below.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange({ name: file.name, size: file.size, previewUrl: URL.createObjectURL(file) });
  }

  function handleClear() {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
        {t("store.product.attachImage")}
      </p>

      {value ? (
        <div className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-input)] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--octo-text-secondary)]">
            {value.name}
          </span>
          <button
            type="button"
            aria-label={t("store.product.attachRemove")}
            onClick={handleClear}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)] hover:text-[#EF4444]"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-border-input)] px-4 py-6 text-center transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Upload size={18} className="text-[var(--octo-text-muted)]" aria-hidden="true" />
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">
            {t("store.product.attachHint")}
          </span>
        </button>
      )}

      {/* There is no backend. Saying so beats implying the kitchen will see it. */}
      <p className="text-[10.5px] text-[var(--octo-text-faint)]">
        {t("store.product.attachLocalOnly")}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
