import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { LoginForm } from "@/features/session/login";
import { useI18n } from "@/app/providers/i18n-provider";

const LOGO_URL = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

// Minimum gap between spawned ripples, in ms — keeps a fast mouse sweep from
// flooding the DOM with ring elements while still reading as continuous.
const RIPPLE_INTERVAL_MS = 90;

export function LoginPage() {
  const { t } = useI18n();
  const rippleLayerRef = useRef<HTMLDivElement>(null);
  const lastRippleAtRef = useRef(0);

  const features = [
    t("login.feature.payments"),
    t("login.feature.invoicing"),
    t("login.feature.inventory"),
    t("login.feature.staff"),
  ];

  // Ripples are appended/removed imperatively (never through React state) so
  // a fast mousemove doesn't trigger a re-render per frame. The layer div
  // always renders empty in JSX, so React never reconciles these children.
  function handleWaterPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const layer = rippleLayerRef.current;
    if (!layer) return;

    const now = performance.now();
    if (now - lastRippleAtRef.current < RIPPLE_INTERVAL_MS) return;
    lastRippleAtRef.current = now;

    const rect = layer.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "octo-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    layer.appendChild(ripple);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--octo-page-bg)] px-4 py-10">
      <div className="flex w-full max-w-[960px] items-stretch overflow-hidden rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] shadow-[0_32px_80px_-28px_rgba(15,23,42,0.35)]">
        {/* Brand panel — hidden below lg so the form owns smaller screens */}
        <div
          className="octo-tide-bg relative hidden w-[46%] flex-col justify-between overflow-hidden p-11 lg:flex"
          onPointerMove={handleWaterPointerMove}
        >
          {/* Signature motif — a sweep of tentacle-like curves with suckers,
              standing in for the octopus mark instead of a literal cartoon. */}
          <svg
            className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-[0.14]"
            viewBox="0 0 480 640"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M-40 60 C 90 20, 190 110, 150 230 C 118 330, 230 350, 260 460 C 284 546, 220 590, 260 660"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M40 -20 C 140 60, 120 170, 220 210 C 320 250, 300 360, 400 400 C 470 428, 460 500, 520 540"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.7"
            />
            {[
              [150, 230],
              [174, 268],
              [220, 350],
              [244, 400],
              [260, 460],
            ].map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" stroke="white" strokeWidth="1.5" />
            ))}
          </svg>
          {/* Diagonal sheen for depth — a soft light source, not a decorative blob */}
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent" />

          {/* Tideline — three drifting wave silhouettes at different speeds
              and depths, so the water actually moves instead of a static
              gradient standing in for it. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 overflow-hidden" aria-hidden="true">
            <svg
              className="octo-wave absolute -bottom-3 h-[90px] w-[200%]"
              style={{ animationDuration: "26s" }}
              viewBox="0 0 800 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,50 C50,30 150,30 200,50 C250,70 350,70 400,50 C450,30 550,30 600,50 C650,70 750,70 800,50 L800,100 L0,100 Z"
                fill="white"
                fillOpacity="0.08"
              />
            </svg>
            <svg
              className="octo-wave absolute -bottom-1 h-[64px] w-[200%]"
              style={{ animationDuration: "17s", animationDirection: "reverse" }}
              viewBox="0 0 800 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,55 C50,35 150,35 200,55 C250,75 350,75 400,55 C450,35 550,35 600,55 C650,75 750,75 800,55 L800,100 L0,100 Z"
                fill="white"
                fillOpacity="0.13"
              />
            </svg>
            <svg
              className="octo-wave absolute bottom-0 h-10 w-[200%]"
              style={{ animationDuration: "11s" }}
              viewBox="0 0 800 100"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0,60 C50,40 150,40 200,60 C250,80 350,80 400,60 C450,40 550,40 600,60 C650,80 750,80 800,60 L800,100 L0,100 Z"
                fill="white"
                fillOpacity="0.18"
              />
            </svg>
          </div>

          <div className="relative z-10 flex items-center gap-2.5">
            <img src={LOGO_URL} alt="OCTOPUS logo" width={36} height={36} className="rounded-xl bg-white object-contain p-1.5" />
            <span className="text-[15px] font-bold tracking-tight text-white">OCTOPUS</span>
          </div>

          <div className="relative z-10">
            <h2 className="max-w-[380px] text-[30px] font-bold leading-[1.15] tracking-tight text-white">
              {t("login.tagline")}
            </h2>
            <p className="mt-3.5 max-w-[360px] text-[13px] leading-relaxed text-white/80">
              {t("login.description")}
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm"
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-[11px] text-white/60">© 2026 OCTOPUS · {t("login.madeInSaudi")}</p>

          {/* Ripple layer — kept permanently empty in JSX; rings are added
              and removed imperatively by handleWaterPointerMove above. */}
          <div ref={rippleLayerRef} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true" />
        </div>

        {/* Form side */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-14">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <img src={LOGO_URL} alt="OCTOPUS logo" width={32} height={32} className="rounded-lg object-contain" />
              <span className="text-[15px] font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
