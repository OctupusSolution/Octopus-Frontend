import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, LogOut, KeyRound } from "lucide-react";
import clsx from "clsx";
import { ApprovalPinDialog, useApprovalPinTitle } from "@/features/session/approval-pin";
import { routes } from "@/app/routes/registry";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import type { ModuleId } from "@/shared/catalog";
import { labelKey } from "@/shared/lib/labels";
import { ShellIcon } from "@/shared/ui/shell-icon";

// Navigation content is the OCTOPUS Restaurants SRS, Section 18.1
// ("Navigation Model — Manager & Owner Console"), verbatim. The section
// grouping / tree-connector / collapse-to-rail INTERACTION PATTERN below
// mirrors the reference dashboard design, not its (insurance) content.
interface NavGroup {
  id: string;
  label: string;
  /** A file in apps/assets/Dashboard/icons — the frame's own nav icon. */
  icon: string;
  items?: string[];
  /** Destination for a group whose id is not itself a route id — the entries
   *  promoted out of a parent group (Wait list, Floor Plan, Promotions,
   *  Payments) all point at a nested route. */
  path?: string;
  /** No page exists yet, so the entry renders but does not navigate. */
  placeholder?: boolean;
}
interface NavSection {
  label: string;
  groups: NavGroup[];
}

// The frame's nav, in the frame's order: four unlabelled blocks separated only
// by a gap. Pages promoted out of a parent group (Wait list, Floor Plan,
// Payments) MOVE rather than duplicate — one page, one place in the nav.
const SECTIONS: NavSection[] = [
  {
    label: "Overview",
    groups: [{ id: "dashboard", label: "Dashboard", icon: "nav-home.svg" }],
  },
  {
    label: "Operations",
    groups: [
      // No sub-items: Reservations is a single page, so the entry navigates
      // straight to it rather than opening a dropdown.
      { id: "reservations", label: "Reservations", icon: "nav-reservations.svg" },
      { id: "waitlist", label: "Wait list", icon: "nav-waitlist.svg", path: "/reservations/waitlist" },
      // A group with its own path: the Live Floor Plan and the Builder are two
      // views of one floor, and every builder route sits under this path so
      // the group stays lit while the merchant is inside any of them.
      { id: "floor-plan", label: "Floor Plan", icon: "nav-floor-plan.svg", path: "/reservations/floor-plan",
        items: ["Live Floor Plan", "Floor Plan Builder"] },
      { id: "public-link", label: "Public Link Builder", icon: "nav-link.svg", path: "/public-link" },
    ],
  },
  {
    label: "Business",
    groups: [
      // No sub-items: a menu is the root entity and /menu is the library of
      // them, so the entry navigates straight there.
      { id: "menu", label: "Menu", icon: "nav-menu.svg" },
      // No sub-items: Live Orders is the only Orders page.
      { id: "orders", label: "Orders", icon: "nav-orders.svg" },
      // No sub-items: Customer CRM is a single list+detail page.
      { id: "customers", label: "Customer CRM", icon: "nav-customers.svg" },
      { id: "pos", label: "POS", icon: "nav-pos.svg", placeholder: true },
    ],
  },
  {
    label: "Manage",
    groups: [
      { id: "settings", label: "Settings", icon: "nav-settings.svg",
        items: ["Business & Legal Entities", "Branches & Sections", "Devices & Printers", "Roles & Permissions", "Tax Profile", "Restaurant Type & Modules"] },
      { id: "reports", label: "Reports", icon: "nav-reports.svg", placeholder: true },
      { id: "integrations", label: "Integrations", icon: "nav-integrations.svg", placeholder: true },
      // No sub-items: Staff is a single tabbed page (Staff / Roles &
      // Permissions / Shifts).
      { id: "staff", label: "Staff", icon: "nav-staff.svg" },
      { id: "promotions", label: "Promotions", icon: "nav-promotions.svg", placeholder: true },
      { id: "payments", label: "Payments", icon: "nav-payments.svg", path: "/finance/payments" },
    ],
  },
];

// Which module owns each nav group. A group whose module the tenant did not
// buy is not rendered at all — a cloud kitchen genuinely has no Reservations
// section rather than a greyed-out one. Groups with no entry here (Dashboard)
// are always present.
const GROUP_MODULE: Record<string, ModuleId> = {
  orders: "orders",
  menu: "orders",
  reservations: "bookings",
  waitlist: "bookings",
  "floor-plan": "bookings",
  customers: "customers",
  payments: "payments",
  pos: "orders",
  staff: "hr",
  settings: "core",
};

// Sub-pages that belong to a different module than their parent, so they come
// and go on their own without taking the rest of the group with them.
const ITEM_MODULE: Record<string, ModuleId> = {};

// Derived from the route registry so every routed page automatically gets
// sidebar navigation without an edit here.
const ROUTES: Record<string, string> = Object.fromEntries(routes.map((r) => [r.id, r.path]));

// Sidebar sub-items that already have a routed page. Items without an entry
// stay inert placeholders until their page is built.
const ITEM_PATHS: Record<string, string> = {
  "Live Floor Plan": "/reservations/floor-plan",
  "Floor Plan Builder": "/reservations/floor-plan/builder",
  "Business & Legal Entities": "/settings/business",
  "Branches & Sections": "/settings/branches",
  "Devices & Printers": "/settings/devices",
  "Roles & Permissions": "/settings/roles",
  "Tax Profile": "/settings/tax",
  "Restaurant Type & Modules": "/settings/modules",
};

// Where each top-level group goes. Most groups are named after their own
// route id; the promoted ones carry an explicit `path` instead.
const ALL_GROUPS: NavGroup[] = SECTIONS.flatMap((s) => s.groups);
const GROUP_PATH: Record<string, string> = Object.fromEntries(
  ALL_GROUPS.map((g) => [g.id, g.path ?? ROUTES[g.id]]).filter(([, path]) => !!path) as [string, string][]
);

// "/reservations" is a prefix of "/reservations/waitlist", so a plain
// startsWith would light up Reservations while the merchant is on Wait list.
// Only the longest matching group path — the most specific one — wins.
function groupForPath(pathname: string): string | undefined {
  return Object.entries(GROUP_PATH)
    .filter(([, path]) => pathname === path || (path !== "/" && pathname.startsWith(path + "/")))
    .sort((a, b) => b[1].length - a[1].length)[0]?.[0];
}

function filterGroups(
  groups: readonly NavGroup[],
  isModuleEnabled: (id: ModuleId) => boolean
): NavGroup[] {
  return groups
    .filter((group) => {
      const moduleId = GROUP_MODULE[group.id];
      return !moduleId || isModuleEnabled(moduleId);
    })
    .map((group) => {
      if (!group.items) return group;
      const items = group.items.filter((item) => {
        const moduleId = ITEM_MODULE[item];
        return !moduleId || isModuleEnabled(moduleId);
      });
      return { ...group, items };
    });
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

function OctopusMark({ size = 30 }: { size?: number }) {
  const logoUrl = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

  return <img src={logoUrl} alt="OCTOPUS logo" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
}

// Hoisted to module scope on purpose: defining these INSIDE AppSidebar's
// render body would make React treat them as a new component type every
// render, forcing a full unmount/remount of every nav button and dropdown
// on every state change — which silently defeats the CSS transition below
// (the element never survives long enough to animate, it just reappears at
// its final state) and drops focus/DOM state along the way.
function GroupButton({
  group,
  collapsed,
  isActive,
  isOpen,
  onClick,
  onMouseEnter,
  setRef,
}: {
  group: NavGroup;
  collapsed: boolean;
  isActive: boolean;
  isOpen: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  setRef: (el: HTMLButtonElement | null) => void;
}) {
  const { t } = useI18n();
  const label = t(labelKey(group.label));
  const disabled = !!group.placeholder;

  return (
    <button
      ref={setRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
      title={disabled ? `${label} — ${t("sidebar.comingSoon")}` : collapsed ? label : undefined}
      className={clsx(
        "flex w-full items-center gap-2 rounded-[12px] p-2 text-start text-[14px] font-medium leading-[14px] transition-colors",
        collapsed && "justify-center",
        disabled
          ? "cursor-default text-white/40"
          : isActive
            ? "bg-[#f5f9ff] text-[#004bb9]"
            : "text-white hover:bg-white/10"
      )}
    >
      <ShellIcon name={group.icon} size={16} />
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {group.items && (
            <ShellIcon name="nav-arrow-down.svg" size={16} className={clsx("transition-transform duration-300", isOpen && "rotate-180")} />
          )}
        </>
      )}
    </button>
  );
}

// Animated expand/collapse via a max-height transition. (Tried the
// grid-template-rows 0fr/1fr trick first — it's the more elegant approach
// on paper, but its `fr`-track intrinsic sizing did not compute correctly
// in testing here, and it's historically unreliable in Safari too. A capped
// max-height is less clever but transitions consistently everywhere; the
// cap just needs to stay above the tallest group's real content height.)
function GroupItems({ group, open, activePath }: { group: NavGroup; open: boolean; activePath: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  if (!group.items) return null;

  // Several sibling items can share a path prefix (e.g. "/customers" is a
  // prefix of "/customers/feedback"), so a plain startsWith check would
  // light up more than one item at once. Only the single longest matching
  // path — the most specific one — counts as active.
  // `activePath` carries the query string too, so an item that targets a tab
  // (e.g. "/staff?tab=shifts") only lights up on that tab; plain paths still
  // match on the pathname alone.
  const [activePathname] = activePath.split("?");
  const bestMatchPath = group.items
    .map((item) => ITEM_PATHS[item])
    .filter(
      (path): path is string =>
        !!path &&
        (path.includes("?")
          ? activePath === path
          : activePathname === path || activePathname.startsWith(path + "/"))
    )
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div
      className={clsx(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
        open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="relative ms-4 mt-0.5 flex flex-col gap-0.5 border-s border-white/20 ps-3 pb-1">
        {group.items.map((item) => {
          const path = ITEM_PATHS[item];
          const isActive = !!path && path === bestMatchPath;
          return (
            <button
              key={item}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                if (path) navigate(path);
              }}
              className={clsx(
                "relative rounded-[12px] px-2.5 py-1.5 text-start text-[12px] transition-colors",
                "before:absolute before:start-[-13px] before:top-1/2 before:h-px before:w-2.5 before:bg-white/20",
                isActive
                  ? "bg-[#f5f9ff] font-medium text-[#004bb9]"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              )}
            >
              {t(labelKey(item))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The two rounded cards that sit under the nav. They share a shell — a pill
// with a 38px thumbnail, a two-line label and a chevron — so the business and
// the signed-in user read as one stacked pair rather than two unrelated rows.
function FooterCard({
  collapsed,
  thumb,
  title,
  subtitle,
  open,
  onToggle,
  ariaLabel,
  children,
}: {
  collapsed: boolean;
  thumb: React.ReactNode;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  // The collapsed rail has nowhere to hang a dropdown, so the cards degrade to
  // plain thumbnails rather than buttons that would open nothing.
  if (collapsed) {
    return <div title={title} className="mx-auto">{thumb}</div>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={clsx(
          "flex w-full items-center gap-2 rounded-[24px] p-2 text-start text-white transition-colors",
          open ? "bg-white/15" : "bg-white/10 hover:bg-white/[0.14]"
        )}
      >
        {thumb}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-[14px] font-medium leading-[14px] text-white">{title}</p>
          <p className="truncate text-[12px] leading-[12px] text-[#f1f5f9]">{subtitle}</p>
        </div>
        <ShellIcon name="nav-arrow-down.svg" size={16} className={clsx("transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute bottom-full start-0 z-50 mb-2 w-full min-w-[224px] rounded-2xl border border-white/10 bg-[#001E4B] p-1.5 shadow-xl">
          {children}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: (collapsed: boolean) => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ dashboard: true });
  const [activeGroup, setActiveGroup] = useState("dashboard");
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number; left: number } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const pinTitle = useApprovalPinTitle();
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const footerRef = useRef<HTMLDivElement | null>(null);
  const userToggled = useRef(false);
  const setCollapsed = onToggleCollapsed;
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir } = useI18n();
  const { user, signOut } = useAuth();
  const { isModuleEnabled } = useTenantConfig();

  const accountEmail = user?.email?.trim() || t("sidebar.emailFallback");
  const userName = user?.name?.trim() || t("sidebar.userFallback");
  const userInitials = initialsOf(userName);

  // The mock session only ever carries "owner", but a real one will carry the
  // rest of the staff roles — translate through the shared staff dictionary
  // and fall back to the raw string rather than printing a bare key.
  const roleKey = `staff.role.${user?.role ?? ""}`;
  const roleLabel = user?.role ? (t(roleKey) === roleKey ? user.role : t(roleKey)) : t("sidebar.emailFallback");

  // Navigation is filtered to what this tenant actually bought, at both
  // levels: whole groups, and individual sub-items that belong to a
  // different module than their parent.
  const visibleSections = useMemo(
    () =>
      SECTIONS.map((section) => ({
        ...section,
        groups: filterGroups(section.groups, isModuleEnabled),
      })).filter((section) => section.groups.length > 0),
    [isModuleEnabled]
  );

  // Auto-collapse to the icon rail below 900px so main content never gets
  // crushed. Stops adjusting once the user has manually toggled it.
  useEffect(() => {
    function onResize() {
      if (userToggled.current) return;
      onToggleCollapsed(window.innerWidth < 900);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onToggleCollapsed]);

  // Close the account menu on any outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    function closeAll() {
      setAccountOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      if (footerRef.current && !footerRef.current.contains(e.target as Node)) closeAll();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  // Keep the highlighted group in sync with the URL — covers direct nav,
  // browser back/forward, not just clicks inside this component. Sub-paths
  // (e.g. /orders/history) highlight their parent group (/orders).
  useEffect(() => {
    const match = groupForPath(location.pathname);
    if (match) setActiveGroup(match);
  }, [location.pathname]);

  // On load and on cross-module navigation, the group that owns the current
  // route becomes the one expanded group (replacing, not merging, so the
  // accordion invariant — at most one open — always holds). Same-group
  // navigation keeps whatever the user chose manually.
  useEffect(() => {
    setExpanded((prev) => (prev[activeGroup] ? prev : { [activeGroup]: true }));
  }, [activeGroup]);

  // Accordion: opening a group closes whichever other one was open.
  function toggle(id: string) {
    setExpanded((prev) => (prev[id] ? {} : { [id]: true }));
  }

  function openFlyout(group: NavGroup) {
    const el = itemRefs.current[group.id];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // The flyout is 224px wide (w-56). In LTR it opens to the right of the
    // rail; in RTL the rail sits at the viewport's right edge, so it must
    // open to the LEFT or it would render off-screen.
    setFlyout({
      group,
      top: rect.top,
      left: dir === "rtl" ? rect.left - 8 - 224 : rect.right + 8,
    });
  }

  // In the collapsed icon rail there's no inline dropdown, so a click there
  // still both navigates and opens the flyout. In the full sidebar, a group
  // with sub-items is just a header now — its own click only toggles the
  // dropdown, never navigates; only its sub-items (or a childless group like
  // Dashboard) do that.
  function handleGroupClick(group: NavGroup) {
    // Nothing to navigate to and nothing to open — the entry is a signpost
    // for a page that has not been built yet.
    if (group.placeholder) return;

    if (collapsed) {
      setActiveGroup(group.id);
      const path = GROUP_PATH[group.id];
      if (path) navigate(path);
      group.items ? openFlyout(group) : setFlyout(null);
      return;
    }
    if (group.items) {
      toggle(group.id);
      return;
    }
    setActiveGroup(group.id);
    const path = GROUP_PATH[group.id];
    if (path) navigate(path);
  }

  function renderGroup(group: NavGroup) {
    return (
      <div key={group.id}>
        <GroupButton
          group={group}
          collapsed={collapsed}
          isActive={activeGroup === group.id}
          isOpen={!!expanded[group.id]}
          onClick={() => handleGroupClick(group)}
          onMouseEnter={() => { if (collapsed && group.items) openFlyout(group); }}
          setRef={(el) => { itemRefs.current[group.id] = el; }}
        />
        {!collapsed && <GroupItems group={group} open={!!expanded[group.id]} activePath={location.pathname + location.search} />}
      </div>
    );
  }

  return (
    <aside
      // The sidebar is always the dark navy brand panel, independent of the
      // console's own light/dark toggle — but `.octo-scroll`'s colors read
      // `[data-theme]` off <html>, so in light mode the nav's scrollbar was
      // painted with the light palette (a pale thumb on a near-white track)
      // on top of navy, reading as a mismatched native bar. Pinning the
      // attribute here, scoped to just this subtree, keeps the nav's
      // scrollbar dark regardless of what the rest of the console is doing.
      data-theme="dark"
      className={clsx(
        "relative flex shrink-0 flex-col overflow-hidden transition-[width] bg-[#001E4B]",
        collapsed ? "w-[64px]" : "w-[220px]"
      )}
      onMouseLeave={() => collapsed && setFlyout(null)}
    >
      <div className={clsx("flex h-[81px] shrink-0 items-center border-b border-[#f1f5f9] px-3 py-2", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <button
            onClick={() => { userToggled.current = true; setCollapsed(false); }}
            className="grid h-8 w-8 place-items-center rounded-[8px] text-white transition-colors hover:bg-white/10"
            aria-label={t("sidebar.expand")}
          >
            <ShellIcon name="nav-toggle.svg" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-0.5">
              <OctopusMark />
              <span className="text-[14px] font-bold leading-[14px] text-white">OCTOPUS</span>
            </div>
            <button
              onClick={() => { userToggled.current = true; setCollapsed(true); }}
              className="grid h-6 w-6 place-items-center rounded-[6px] text-white transition-colors hover:bg-white/10"
              aria-label={t("sidebar.collapse")}
            >
              <ShellIcon name="nav-toggle.svg" />
            </button>
          </>
        )}
      </div>

      {/* The frame drops the uppercase section captions — the sections survive
          purely as the vertical gaps that still group the nav. */}
      <nav className="octo-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-visible px-2 pb-2 pt-4">
        {visibleSections.map((section) => (
          <div key={section.label}>{section.groups.map(renderGroup)}</div>
        ))}
      </nav>

      <div ref={footerRef} className={clsx("flex flex-col pb-6 pt-2", collapsed ? "px-2" : "px-4")}>
        <FooterCard
          collapsed={collapsed}
          ariaLabel={t("sidebar.accountMenu")}
          open={accountOpen}
          onToggle={() => setAccountOpen((o) => !o)}
          title={userName}
          subtitle={roleLabel}
          thumb={
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0d6efd] text-[14px] font-bold leading-[14px] text-white">
              {userInitials}
            </div>
          }
        >
          <div className="border-b border-white/10 px-2.5 pb-2 pt-1">
            <p className="truncate text-[12.5px] font-semibold text-white">{userName}</p>
            <p className="truncate text-[11px] text-white/60">{accountEmail}</p>
          </div>
          <button
            type="button"
            onClick={() => setAccountOpen(false)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[12.5px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HelpCircle size={14} />
            {t("sidebar.helpSupport")}
          </button>
          <button
            type="button"
            onClick={() => { setAccountOpen(false); setPinOpen(true); }}
            className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[12.5px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          >
            <KeyRound size={14} />
            {pinTitle}
          </button>
          <button
            type="button"
            onClick={() => { setAccountOpen(false); signOut(); }}
            className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-[12.5px] font-medium text-[#FF8A8A] transition-colors hover:bg-white/10"
          >
            <LogOut size={14} />
            {t("common.signOut")}
          </button>
        </FooterCard>
      </div>
      <ApprovalPinDialog open={pinOpen} onClose={() => setPinOpen(false)} />

      {collapsed && flyout && (
        <div
          className="fixed z-50 w-56 rounded-xl border border-white/10 bg-[#001E4B] p-2 shadow-lg"
          style={{ top: flyout.top, left: flyout.left }}
          onMouseEnter={() => setFlyout(flyout)}
        >
          <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {t(labelKey(flyout.group.label))}
          </p>
          {flyout.group.items?.map((item) => (
            <button
              key={item}
              onClick={() => {
                const path = ITEM_PATHS[item];
                if (path) navigate(path);
                setFlyout(null);
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-start text-[12.5px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {t(labelKey(item))}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
