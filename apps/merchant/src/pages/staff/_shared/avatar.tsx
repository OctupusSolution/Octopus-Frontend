import { useState } from "react";
import clsx from "clsx";
import { staffPhoto } from "./staff-photos";

const PALETTE = [
  "bg-[var(--octo-tone-info-bg)] text-[var(--octo-tone-info-text)]",
  "bg-[var(--octo-tone-violet-bg)] text-[var(--octo-tone-violet-text)]",
  "bg-[var(--octo-tone-success-bg)] text-[var(--octo-tone-success-text)]",
  "bg-[var(--octo-tone-warning-bg)] text-[var(--octo-tone-warning-text)]",
  "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]",
  "bg-[var(--octo-tone-slate-bg)] text-[var(--octo-tone-slate-text)]",
];

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ name, size = 44, className }: { name: string; size?: number; className?: string }) {
  const photo = staffPhoto(name);
  const [failed, setFailed] = useState(false);

  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt=""
        aria-hidden
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className={clsx("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={clsx("grid shrink-0 place-items-center rounded-full font-semibold", PALETTE[hash % PALETTE.length], className)}
    >
      {initialsOf(name)}
    </span>
  );
}
