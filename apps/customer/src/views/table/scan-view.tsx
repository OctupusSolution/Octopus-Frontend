"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { TABLE_ROUTES, tableFromQr } from "@/shared/lib/table-flow";
import { TableIcon } from "@/shared/ui/table";

// Not in TypeScript's DOM library yet. Chromium ships it; Safari does not, which
// is why the code also arrives as a link the phone's own camera can open.
interface QrDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

const STEP_KEYS = ["store.table.stepCode", "store.table.stepStatus", "store.table.stepSession"] as const;
const STEP_MS = 700;
const SCAN_MS = 350;

export interface TableScanViewProps {
  tenantId: string;
  /** Sample storefront only: the table the shutter falls back to, so the flow
   *  can be walked on a machine with no camera and no printed code. */
  demoTable: string | null;
}

export function TableScanView({ tenantId, demoTable }: TableScanViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  // The session's setters are new functions on every render; reading them through
  // a ref keeps `connect` stable, so the camera is not restarted by a re-render.
  const session = useOrderingSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<QrDetector | null>(null);
  const [live, setLive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [stepsDone, setStepsDone] = useState(0);

  const connect = useCallback(
    (table: string) => {
      sessionRef.current.setTable(table);
      sessionRef.current.setChannel(tenantId, "dine_in");
      setConnecting(true);
    },
    [tenantId],
  );

  // A printed code is a link here carrying the table, so the phone's own camera
  // lands on this screen already knowing it.
  const linkedTable = searchParams.get("table") ?? searchParams.get("t");
  useEffect(() => {
    if (linkedTable) connect(linkedTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedTable]);

  const scanOnce = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) return null;
    try {
      const [code] = await detector.detect(video);
      return code ? tableFromQr(code.rawValue) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (connecting) return;
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        // Refused or no camera: the screen keeps its still backdrop.
        return;
      }
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      setLive(true);

      const Detector = (window as unknown as { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector;
      if (!Detector) return;
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      timer = window.setInterval(async () => {
        const table = await scanOnce();
        if (table && !cancelled) connect(table);
      }, SCAN_MS);
    }

    void start();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      setLive(false);
    };
  }, [connect, connecting, scanOnce]);

  useEffect(() => {
    if (!connecting) return;
    const timers = STEP_KEYS.map((_, index) =>
      window.setTimeout(() => setStepsDone(index + 1), STEP_MS * (index + 1)),
    );
    const done = window.setTimeout(
      () => router.replace(TABLE_ROUTES.welcome),
      STEP_MS * (STEP_KEYS.length + 1),
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(done);
    };
  }, [connecting, router]);

  async function handleShutter() {
    const table = (await scanOnce()) ?? demoTable;
    if (table) connect(table);
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        aria-label={t("store.table.scanTitle")}
        className={`absolute inset-0 size-full object-cover ${live ? "" : "hidden"}`}
      />
      {!live && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/table/scan-backdrop.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )}

      <div className="absolute inset-x-4 top-[calc(50%+10px)] h-[480px] -translate-y-1/2">
        {/* The dimmed surround: one window-shaped element whose shadow covers the rest. */}
        <div
          className="absolute inset-x-0 top-[5.36px] h-[494.62px] rounded-2xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.72)]"
          aria-hidden="true"
        />

        {!live && (
          <TableIcon
            name="scan-sample-qr"
            size={260}
            className="absolute left-1/2 top-[134px] -translate-x-1/2"
          />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/table/scan-corners-top.svg"
          alt=""
          className="absolute inset-x-0 top-[95px] h-[63.86px] w-full"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/table/scan-corners-bottom.svg"
          alt=""
          className="absolute inset-x-0 top-[367px] h-[63.86px] w-full rotate-180"
        />

        <div
          className="absolute inset-x-0 top-[126px] h-[291px] border-t-[3px] border-ocean-blue bg-[linear-gradient(180deg,rgba(24,93,253,0.54)_0%,rgba(24,177,253,0)_40.665%)]"
          aria-hidden="true"
        />

        <div
          className="absolute inset-0 rounded-2xl border-[6px] border-dashed border-white"
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        aria-label={t("store.table.scanCapture")}
        onClick={handleShutter}
        className="absolute bottom-6 left-1/2 flex size-[54px] -translate-x-1/2 items-start rounded-[27px] border-2 border-white p-[3px]"
      >
        <span className="flex size-12 items-center justify-center rounded-[24px] bg-white">
          <TableIcon name="scan-camera" size={28} />
        </span>
      </button>

      {connecting && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-black/70 px-4"
        >
          <div className="flex w-full max-w-[448px] flex-col gap-4 rounded-[32px] bg-gray-50 p-4">
            <div className="flex flex-col items-center gap-[15px]">
              <p className="text-center text-[24px] font-bold leading-none text-gray-900">
                {t("store.table.connecting")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/table/loading.gif" alt="" className="size-[152px]" />
            </div>

            <ul className="relative flex flex-col gap-3">
              <li className="absolute start-3 top-1/2 flex size-0 items-center justify-center" aria-hidden="true">
                <TableIcon name="connect-line" size={[61, 1]} className="rotate-90" />
              </li>
              {STEP_KEYS.map((key, index) => {
                const done = index < stepsDone;
                return (
                  <li
                    key={key}
                    className={`relative flex items-center gap-1 text-[14px] font-medium leading-none ${
                      done ? "text-gray-900" : "text-[var(--octo-store-select-label)]"
                    }`}
                  >
                    <TableIcon name={done ? "check-on" : "check-off"} />
                    {t(key)}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
