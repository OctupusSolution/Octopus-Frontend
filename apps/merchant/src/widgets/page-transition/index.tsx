import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";

const logoUrl = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

const FADE_OUT_MS = 200;
const HOLD_MS = 300;

// Route-change transition: fades the outgoing page out, holds a centered
// pulsing OCTOPUS mark, then fades the new page in. `children` is always
// the CURRENT route's content (already swapped by React Router) — this
// component only choreographs the overlay on top of it, so there's no need
// to hold onto the previous page's element tree.
export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;

    setPhase("out");
    const toIn = setTimeout(() => setPhase("in"), FADE_OUT_MS + HOLD_MS);
    const toIdle = setTimeout(() => setPhase("idle"), FADE_OUT_MS + HOLD_MS + 250);
    return () => {
      clearTimeout(toIn);
      clearTimeout(toIdle);
    };
  }, [location.pathname]);

  const showOverlay = phase !== "idle";

  return (
    <div className="relative h-full min-h-0">
      <div
        className={clsx(
          "h-full min-h-0",
          phase === "out" ? "opacity-0 transition-opacity duration-200 ease-in" : "opacity-100 transition-opacity duration-300 ease-out"
        )}
      >
        {children}
      </div>

      {showOverlay && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[var(--octo-card)]">
          <img
            src={logoUrl}
            alt=""
            className="h-14 w-14 animate-octo-pulse"
          />
        </div>
      )}
    </div>
  );
}
