"use client";

import { useState } from "react";

export interface ProductGalleryProps {
  images: string[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  return (
    // row-reverse puts the thumbnail strip at the start edge, mirroring with
    // the language rather than needing a second rule for LTR.
    <div className="flex flex-row-reverse gap-4">
      <div className="flex-1 rounded-[20px] bg-[var(--octo-card)] p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={main} alt={alt} className="mx-auto h-[300px] w-full object-contain sm:h-[420px]" />
      </div>

      {images.length > 1 && (
        <ul className="flex shrink-0 flex-col gap-3">
          {images.map((src, index) => (
            <li key={`${src}-${index}`}>
              <button
                type="button"
                aria-label={`${alt} ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={`grid h-[92px] w-[92px] place-items-center rounded-[20px] bg-[var(--octo-store-soft)] p-3 transition-shadow sm:h-[140px] sm:w-[140px] ${
                  index === active ? "ring-2 ring-[var(--octo-brand)]" : "ring-1 ring-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
