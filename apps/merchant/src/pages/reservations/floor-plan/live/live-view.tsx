// The floor a host works from during service: the whole page is the plan,
// every table in its live colour; picking one shows what is happening at it.
// Plan management (summary, editing) lives on the floor plan builder page.
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ClipboardList, Maximize, MessageCircle, Minimize } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { zoneForTable, type FloorItem, type FloorTable, type LiveStatus, type PublishedFloorPlan } from "@/entities/floor-plan";
import { PlanViewport, type ItemKind, type ZoomSetting } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { PageShell } from "../_shared/page-header";
import { ToastBanner, useToast } from "../_shared/toast";
import { useLiveTables } from "../_shared/use-floor-plan";
import { SendMessageModal, UpdateTableForm, ViewOrderModal } from "./live-modals";
import { TableDetailCard } from "./table-detail-card";

const TABLES_ONLY: ReadonlySet<ItemKind> = new Set(["table"]);
const FIT: ZoomSetting = { mode: "fit" };

type ModalId = "message" | "order";

export function LiveFloorPlan({ published }: { published: PublishedFloorPlan }) {
  const { t } = useI18n();
  const doc = published.doc;
  const live = useLiveTables(doc);
  const { toast, notify } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modal, setModal] = useState<ModalId | null>(null);
  // Full screen puts just the map on the whole display (a host stand or a TV).
  const frameRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  }

  const selected = selectedId ? live.byId.get(selectedId) ?? null : null;
  const selectedZone = selected ? zoneForTable(doc, selected.table) : undefined;
  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);
  const toneFor = (table: FloorTable): LiveStatus =>
    live.byId.get(table.id)?.state.status ?? (table.blocked ? "blocked" : "available");

  return (
    <PageShell fill>
      {/* Full screen takes this wrapper, not just the map, so the table modals
          (rendered inline below) still show while in full screen. */}
      <div ref={frameRef} className="flex min-h-0 flex-1 flex-col">
      <div
        className={clsx(
          "relative min-h-0 flex-1 overflow-hidden bg-white",
          !fullscreen && "rounded-[22px] border-[3px] border-[#1F2937]"
        )}
      >
          <PlanViewport
            doc={doc}
            zoom={FIT}
            fillFrame
            className="h-full overflow-hidden"
            toneFor={toneFor}
            showBackground={false}
            selectedIds={selectedIds}
            interactive={TABLES_ONLY}
            onItemPointerDown={(_event: ReactPointerEvent<SVGGElement>, item: FloorItem) => {
              setSelectedId(item.id);
              setDetailOpen(true);
            }}
            onBackgroundPointerDown={() => {
              setSelectedId(null);
              setDetailOpen(false);
            }}
          />
          {live.entries.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-[#111827]/80 px-4 py-2 text-[13px] font-medium text-white">{t("floorPlan.live.noTables")}</span>
            </div>
          )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={t(fullscreen ? "floorPlan.live.exitFullscreen" : "floorPlan.live.fullscreen")}
          title={t(fullscreen ? "floorPlan.live.exitFullscreen" : "floorPlan.live.fullscreen")}
          className="absolute end-3 top-3 grid h-10 w-10 place-items-center rounded-[10px] bg-[#111827]/80 text-white shadow-lg transition-colors hover:bg-[#111827]"
        >
          {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      <Modal open={detailOpen && selected !== null} onClose={() => setDetailOpen(false)} className="max-w-[780px] !p-0">
        {selected && (
          // Two columns on wide screens (what the table is / change it), one
          // on phones; the body scrolls inside so the modal never leaves the screen.
          <div className="octo-scroll max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-5">
              <div className="flex flex-col gap-3">
                <TableDetailCard entry={selected} zoneName={selectedZone?.name} now={live.now} />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!(selected.state.status === "occupied" || selected.state.status === "reserved")}
                    onClick={() => setModal("message")}
                    className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[#DCFCE7] text-[14px] font-semibold text-[#15803D] transition-colors hover:bg-[#CBF5D8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageCircle size={17} />
                    {t("floorPlan.live.detail.sendMessage")}
                  </button>
                  <button
                    type="button"
                    disabled={!selected.state.orderId || selected.state.status !== "occupied"}
                    onClick={() => setModal("order")}
                    className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-[var(--octo-seg-bg)] text-[14px] font-semibold text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-track)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ClipboardList size={17} />
                    {t("floorPlan.live.detail.viewOrder")}
                  </button>
                </div>
              </div>
              <UpdateTableForm
                entry={selected}
                now={live.now}
                embedded
                onSave={(state) => {
                  live.setTableState(selected.table.id, state);
                  notify(t("floorPlan.live.update.saved").replace("{number}", selected.table.number));
                }}
                onReset={() => {
                  live.clearTableState(selected.table.id);
                  notify(t("floorPlan.live.update.resetDone").replace("{number}", selected.table.number), "info");
                }}
              />
            </div>
          </div>
        )}
      </Modal>
      <SendMessageModal
        open={modal === "message"}
        entry={selected}
        onClose={() => setModal(null)}
        onSent={(name) => {
          setModal(null);
          notify(t("floorPlan.live.message.sent").replace("{name}", name));
        }}
      />
      <ViewOrderModal open={modal === "order"} entry={selected} onClose={() => setModal(null)} />
      <ToastBanner toast={toast} />
      </div>
    </PageShell>
  );
}
