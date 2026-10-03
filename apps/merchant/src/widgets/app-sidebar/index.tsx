import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, CalendarClock, UtensilsCrossed,
  Users, UserCog, Settings, HelpCircle,
  ChevronDown, Search, PanelLeft, LogOut,
  Clock3, Armchair, CreditCard, Link2, KeyRound,
} from "lucide-react";
import clsx from "clsx";
import { ApprovalPinDialog, useApprovalPinTitle } from "@/features/session/approval-pin";
import { routes } from "@/app/routes/registry";
import { useI18n } from "@/app/providers/i18n-provider";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import type { ModuleId } from "@/shared/catalog";
import { labelKey } from "@/shared/lib/labels";

// Navigation content is the OCTOPUS Restaurants SRS, Section 18.1
// ("Navigation Model — Manager & Owner Console"), verbatim. The section
// grouping / tree-connector / collapse-to-rail INTERACTION PATTERN below
// mirrors the reference dashboard design, not its (insurance) content.
interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
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

// The frame promotes five pages out of their parent groups and onto the top
// level. They MOVE rather than duplicate: Reservations no longer lists Floor
// Plan or Waitlist, Marketing no longer lists Promotions, Finance no longer
// lists Payments. One page, one place in the nav.
const SECTIONS: NavSection[] = [
  {
    label: "Overview",
    groups: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    groups: [
      // No sub-items: Live Orders is the only Orders page, so the entry
      // navigates straight to it rather than opening a dropdown.
      { id: "orders", label: "Orders", icon: ClipboardList },
      // No sub-items: Reservations is a single page, so the entry navigates
      // straight to it rather than opening a dropdown.
      { id: "reservations", label: "Reservations", icon: CalendarClock },
      { id: "waitlist", label: "Wait list", icon: Clock3, path: "/reservations/waitlist" },
      // A group with its own path: the Live Floor Plan and the Builder are two
      // views of one floor, and every builder route sits under this path so
      // the group stays lit while the merchant is inside any of them.
      { id: "floor-plan", label: "Floor Plan", icon: Armchair, path: "/reservations/floor-plan",
        items: ["Live Floor Plan", "Floor Plan Builder"] },
      { id: "public-link", label: "Public Link Builder", icon: Link2, path: "/public-link" },
      // No sub-items: a menu is now the root entity and /menu is the library
      // of them, so the entry navigates straight there rather than opening a
      // dropdown onto six sibling tables. Same shape as Reservations above.
      { id: "menu", label: "Menu", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Business",
    groups: [
      // No sub-items: Customer CRM is now a single list+detail page, so the
      // entry navigates straight to it rather than opening a dropdown. Same
      // shape as Orders/Reservations/Menu/Staff above.
      { id: "customers", label: "Customer CRM", icon: Users },
      { id: "payments", label: "Payments", icon: CreditCard, path: "/finance/payments" },
      // No sub-items: Staff is now a single tabbed page (Staff / Roles &
      // Permissions / Shifts), so the entry navigates straight there rather
      // than opening a dropdown. Same shape as Reservations and Menu above.
      { id: "staff", label: "Staff", icon: UserCog },
    ],
  },
];

const FOOTER_GROUPS: NavGroup[] = [
  { id: "settings", label: "Settings", icon: Settings,
    items: ["Business & Legal Entities", "Branches & Sections", "Devices & Printers", "Roles & Permissions", "Tax Profile", "Restaurant Type & Modules"] },
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
const ALL_GROUPS: NavGroup[] = [...SECTIONS.flatMap((s) => s.groups), ...FOOTER_GROUPS];
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

function OctopusMark({ size = 32 }: { size?: number }) {
  const logoUrl = new URL("../../../../assets/Logo/OCTOPUS LOGO.svg", import.meta.url).href;

  return (
    <img
      src={logoUrl}
      alt="OCTOPUS logo"
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
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
  const Icon = group.icon;
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
        "group flex w-full items-center gap-2.5 rounded-full text-start text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2" : "px-3.5 py-2",
        disabled
          ? "cursor-default text-white/40"
          : isActive
            ? "bg-[#F5F9FF] text-ocean-blue hover:bg-[#F5F9FF] hover:text-ocean-blue"
            : "text-white/85 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon
        size={17}
        strokeWidth={1.8}
        className={clsx(
          "shrink-0",
          disabled ? "text-white/40" : isActive ? "text-ocean-blue" : "text-white/85 group-hover:text-white"
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {group.items && (
            <ChevronDown
              size={15}
              className={clsx(
                "transition-transform duration-300",
                isActive ? "text-ocean-blue" : "text-white/70 group-hover:text-white",
                isOpen && "rotate-180"
              )}
            />
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
      <div className="relative ms-[24px] mt-0.5 flex flex-col gap-0.5 border-s border-white/20 ps-3 pb-1">
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
                "relative rounded-full px-2.5 py-1.5 text-start text-[12px] transition-colors",
                "before:absolute before:start-[-13px] before:top-1/2 before:h-px before:w-2.5 before:bg-white/20",
                isActive
                  ? "bg-[#F5F9FF] font-medium text-ocean-blue hover:bg-[#F5F9FF] hover:text-ocean-blue"
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
          "flex w-full items-center gap-2.5 rounded-full py-1.5 pe-2.5 ps-1.5 text-start transition-colors",
          open ? "bg-white/15" : "bg-white/[0.08] hover:bg-white/[0.14]"
        )}
      >
        {thumb}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold leading-tight text-white">{title}</p>
          <p className="truncate text-[10.5px] leading-tight text-white/60">{subtitle}</p>
        </div>
        <ChevronDown size={15} className={clsx("shrink-0 text-white/70 transition-transform duration-200", open && "rotate-180")} />
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

  const visibleFooterGroups = useMemo(
    () => filterGroups(FOOTER_GROUPS, isModuleEnabled),
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
      <div key={group.id} className="mb-0.5">
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
        collapsed ? "w-[64px]" : "w-[248px]"
      )}
      onMouseLeave={() => collapsed && setFlyout(null)}
    >
      <div className={clsx("flex items-center border-b border-white/12 py-4", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        <div className="flex items-center gap-2">
          <OctopusMark size={28} />
          {!collapsed && <span className="text-[15px] font-extrabold tracking-tight text-white">OCTOPUS</span>}
        </div>
        {!collapsed && (
          <button
            onClick={() => { userToggled.current = true; setCollapsed(true); }}
            className="grid h-7 w-7 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={t("sidebar.collapse")}
          >
            <PanelLeft size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => { userToggled.current = true; setCollapsed(false); }}
          className="mx-auto my-1.5 grid h-8 w-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t("sidebar.expand")}
        >
          <Search size={16} strokeWidth={1.8} />
        </button>
      )}

      {/* The frame drops the uppercase section captions — the sections survive
          purely as the vertical gaps that still group the nav. */}
      <nav className={clsx("octo-scroll min-h-0 flex-1 overflow-y-auto overflow-x-visible pb-2 pt-2.5", collapsed ? "px-2" : "px-2.5")}>
        {visibleSections.map((section) => (
          <div key={section.label} className="mb-3">
            {section.groups.map(renderGroup)}
          </div>
        ))}
        {visibleFooterGroups.map(renderGroup)}
      </nav>

      <div ref={footerRef} className={clsx("flex flex-col gap-1.5 pb-3 pt-1", collapsed ? "px-2" : "px-2.5")}>
        <FooterCard
          collapsed={collapsed}
          ariaLabel={t("sidebar.accountMenu")}
          open={accountOpen}
          onToggle={() => setAccountOpen((o) => !o)}
          title={userName}
          subtitle={roleLabel}
          thumb={
            <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-ocean-blue text-[12px] font-semibold text-white">
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
