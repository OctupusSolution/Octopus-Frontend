// The library's single owner: one module-level array read through
// useSyncExternalStore, so every caller sees the same menus.
//
// The list of menus, their names and statuses now come from the backend
// (GET /menus and the lifecycle endpoints); the builder's sections, theme and
// schedule stay local, keyed by menu id, until those stages are wired. `setMenus`
// remains the way local-only edits land in the store.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  ApiError,
  archiveMenu,
  createMenu,
  deleteMenu as deleteMenuApi,
  duplicateMenu as duplicateMenuApi,
  getMenu,
  holdMenu,
  listMenus,
  releaseMenuHold,
  restoreMenu,
  unpublishMenu,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import type { Menu } from "./menu";
import { ensureMenuSettings, fromServer, saveScheduleAndChannels, withScheduleAndChannels } from "./menu-api";
import type { MenuSchedule } from "./menu";

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.problem?.errorCode ?? err.message : fallback;
}

type LoadState = "idle" | "loading" | "ready" | "error";
interface Store {
  menus: Menu[];
  state: LoadState;
  error: string | null;
  businessId: string | null;
}

let store: Store = { menus: [], state: "idle", error: null, businessId: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function patch(next: Partial<Store>) {
  store = { ...store, ...next };
  emit();
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const getSnapshot = () => store;

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

async function load(businessId: string) {
  patch({ businessId, state: "loading", error: null, menus: store.businessId === businessId ? store.menus : [] });
  try {
    await ensureMenuSettings(businessId);
    const res = await listMenus(businessId, { includeArchived: true, pageSize: 100 });
    const local = new Map(store.menus.map((m) => [m.id, m]));
    const rows = res.data.map((row) => fromServer(row, local.get(row.id)));
    patch({ menus: rows, state: "ready" });
    // Schedule and channels are two more reads per menu; the cards show them, so
    // they fill in as they arrive rather than holding the list back.
    void Promise.all(
      rows.map((row) =>
        withScheduleAndChannels(businessId, row).then(
          (full) => patch({ menus: store.menus.map((m) => (m.id === full.id ? { ...m, schedule: full.schedule, channels: full.channels } : m)) }),
          () => undefined
        )
      )
    );
  } catch (err) {
    patch({ state: "error", error: describeError(err, "menu.load-failed") });
  }
}

export function useMenuLibrary() {
  const { activeBusinessId } = useAuth();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (activeBusinessId && store.businessId !== activeBusinessId) void load(activeBusinessId);
  }, [activeBusinessId]);

  const setMenus = useCallback((next: Menu[]) => patch({ menus: next }), []);
  const reload = useCallback(() => {
    if (activeBusinessId) void load(activeBusinessId);
  }, [activeBusinessId]);

  /** Runs one server call and folds its answer back into the store. */
  const apply = useCallback(
    async (menu: Menu, call: (b: string) => Promise<unknown>) => {
      if (!activeBusinessId) throw new Error("no business");
      await call(activeBusinessId);
      const fresh = await getMenu(activeBusinessId, menu.id);
      patch({ menus: store.menus.map((m) => (m.id === menu.id ? fromServer(fresh, m) : m)) });
    },
    [activeBusinessId]
  );

  const actions = {
    replace: (menu: Menu) => patch({ menus: store.menus.map((m) => (m.id === menu.id ? menu : m)) }),
    create: async (name: string): Promise<Menu> => {
      if (!activeBusinessId) throw new Error("no business");
      const res = await createMenu(
        activeBusinessId,
        { businessId: activeBusinessId, name: { en: name, ar: name }, branchScope: null, salesChannels: null },
        key()
      );
      const menu = fromServer(res);
      patch({ menus: [...store.menus, menu] });
      return menu;
    },
    duplicate: async (menu: Menu) => {
      if (!activeBusinessId) throw new Error("no business");
      const res = await duplicateMenuApi(
        activeBusinessId,
        menu.id,
        { businessId: activeBusinessId, menuId: menu.id, name: { en: `${menu.name} (copy)`, ar: `${menu.name} (copy)` } },
        key()
      );
      patch({ menus: [...store.menus, fromServer(res)] });
    },
    archive: (menu: Menu) => apply(menu, (b) => archiveMenu(b, menu.id, menu.version)),
    restore: (menu: Menu) => apply(menu, (b) => restoreMenu(b, menu.id, menu.version)),
    hold: (menu: Menu) => apply(menu, (b) => holdMenu(b, menu.id)),
    release: (menu: Menu) => apply(menu, (b) => releaseMenuHold(b, menu.id)),
    unpublish: (menu: Menu) => apply(menu, (b) => unpublishMenu(b, menu.id)),
    setSchedule: async (menu: Menu, schedule: MenuSchedule, channels: Menu["channels"]) => {
      if (!activeBusinessId) throw new Error("no business");
      const saved = await saveScheduleAndChannels(activeBusinessId, menu, schedule, channels);
      patch({ menus: store.menus.map((m) => (m.id === menu.id ? { ...m, schedule: saved.schedule, channels: saved.channels } : m)) });
    },
    remove: async (menu: Menu) => {
      if (!activeBusinessId) throw new Error("no business");
      await deleteMenuApi(activeBusinessId, menu.id, { expectedVersion: menu.version });
      patch({ menus: store.menus.filter((m) => m.id !== menu.id) });
    },
  };

  return { menus: snap.menus, status: snap.state, error: snap.error, reload, setMenus, ...actions };
}
