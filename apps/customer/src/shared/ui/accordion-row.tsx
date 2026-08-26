"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export interface AccordionRowProps {
  label: string;
  children: ReactNode;
}

export function AccordionRow({ label, children }: AccordionRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[10px] border border-[var(--octo-border-input)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-[12.5px] text-[var(--octo-text-secondary)]"
      >
        {label}
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="border-t border-[var(--octo-divider)] px-3.5 py-3">{children}</div>}
    </div>
  );
}
