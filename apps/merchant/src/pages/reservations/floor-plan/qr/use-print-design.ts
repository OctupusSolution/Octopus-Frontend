// The printed card's design. The server keeps template, size, label style,
// message and colour (shared by the whole business); paper, margins, per-page,
// background, QR style, tent size and logo stay in this browser.
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, getPlaceCodeDesign, updatePlaceCodeDesign } from "@octopus/api-client";
import { designFromServer, designToServer } from "./place-codes-model";
import { DEFAULT_DESIGN, type QrDesign } from "./print";

const prefsKey = (businessId: string) => `octo.qrPrintPrefs.${businessId}`;

function readPrefs(businessId: string): QrDesign {
  try {
    const raw = localStorage.getItem(prefsKey(businessId));
    return raw ? { ...DEFAULT_DESIGN, ...(JSON.parse(raw) as Partial<QrDesign>) } : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

function writePrefs(businessId: string, d: QrDesign) {
  const { paper, margins, perPage, background, qrStyle, tentSize, logo } = d;
  try {
    localStorage.setItem(prefsKey(businessId), JSON.stringify({ paper, margins, perPage, background, qrStyle, tentSize, logo }));
  } catch {
    // A private window: the preferences last for this visit only.
  }
}

/** The server half of a design, comparable across versions. */
const serverHalf = (d: QrDesign) => JSON.stringify(designToServer(d, 0));

export interface PrintDesign {
  design: QrDesign;
  setDesign: (d: QrDesign) => void;
  /** Saves the server half when it changed. A stale save reloads the
   *  current design and rethrows. */
  save: () => Promise<void>;
}

export function usePrintDesign(businessId: string): PrintDesign {
  const [design, setLocal] = useState<QrDesign>(() => readPrefs(businessId));
  const version = useRef<number | null>(null);
  const saved = useRef<string>("");

  const load = useCallback(async () => {
    try {
      const server = await getPlaceCodeDesign(businessId);
      version.current = server.version;
      setLocal((d) => {
        const next = designFromServer(server, d);
        saved.current = serverHalf(next);
        return next;
      });
    } catch {
      // Keep the local design; the page's own load reports what is wrong.
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) void load();
  }, [businessId, load]);

  const setDesign = useCallback(
    (d: QrDesign) => {
      setLocal(d);
      writePrefs(businessId, d);
    },
    [businessId]
  );

  const save = useCallback(async () => {
    if (version.current === null || serverHalf(design) === saved.current) return;
    try {
      const server = await updatePlaceCodeDesign(businessId, designToServer(design, version.current));
      version.current = server.version;
      saved.current = serverHalf(design);
    } catch (e) {
      if (e instanceof ApiError && e.problem?.errorCode === "menu.place-code.design-stale") await load();
      throw e;
    }
  }, [businessId, design, load]);

  return { design, setDesign, save };
}
