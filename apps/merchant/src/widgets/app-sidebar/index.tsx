import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, CalendarClock, UtensilsCrossed, Package,
  Users, Megaphone, Truck, Wallet, UserCog, BarChart3, Settings, HelpCircle,
  ChevronDown, Search, PanelLeft, MoreVertical, LogOut,
} from "lucide-react";
import clsx from "clsx";
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
}
interface NavSection {
  label: string;
  groups: NavGroup[];
}

const SECTIONS: NavSection[] = [
  {
    label: "Overview",
    groups: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operations",
    groups: [
      { id: "orders", label: "Orders", icon: ClipboardList,
        items: ["Live Orders (all channels)", "Order History", "Pre-Orders & Scheduled"] },
      { id: "reservations", label: "Reservations", icon: CalendarClock,
        items: ["Calendar / Timeline", "Floor Plan", "Waitlist", "Private Rooms & Events"] },
      { id: "menu", label: "Menu", icon: UtensilsCrossed,
        items: ["Categories & Items", "Modifiers", "Combos", "Price Lists & Channels", "Schedules & Ramadan Profile", "Availability (86 board)"] },
      { id: "inventory", label: "Inventory", icon: Package,
        items: ["Ingredients & Suppliers", "Recipes & Costing", "Purchase Orders & Receipts", "Stock Counts & Variance", "Waste", "Transfers", "Production"] },
      { id: "delivery", label: "Delivery", icon: Truck,
        items: ["Zones", "Dispatch Board", "Drivers", "Aggregator Channels"] },
    ],
  },
  {
    label: "Business",
    groups: [
      { id: "customers", label: "Customers", icon: Users,
        items: ["Customer List & Profiles", "Segments", "Feedback & Complaints"] },
      { id: "marketing", label: "Marketing", icon: Megaphone,
        items: ["Loyalty Program", "Gift Cards", "Subscriptions & Memberships", "Promotions & Vouchers", "Campaigns"] },
      { id: "finance", label: "Finance", icon: Wallet,
        items: ["Payments & Transactions", "Tax Invoices (ZATCA)", "Settlements & Reconciliation", "Accounting Sync", "House Accounts"] },
      { id: "staff", label: "Staff", icon: UserCog,
        items: ["Employees", "Schedule", "Attendance", "Tips", "Payroll Inputs"] },
      { id: "reports", label: "Reports", icon: BarChart3,
        items: ["Sales", "Costs & Margin", "Channels", "Customers", "Compliance", "Scheduled Reports"] },
    ],
  },
];

const FOOTER_GROUPS: NavGroup[] = [
  { id: "settings", label: "Settings", icon: Settings,
    items: ["My Businesses", "Business & Legal Entities", "Branches & Sections", "Devices & Printers", "Roles & Permissions", "Tax Profile", "Restaurant Type & Modules", "Integrations"] },
];

// Which module owns each nav group. A group whose module the tenant did not
// buy is not rendered at all — a cloud kitchen genuinely has no Reservations
// section rather than a greyed-out one. Groups with no entry here (Dashboard)
// are always present.
const GROUP_MODULE: Record<string, ModuleId> = {
  orders: "orders",
  menu: "orders",
  reservations: "bookings",
  inventory: "inventory",
  delivery: "delivery",
  customers: "customers",
  marketing: "loyalty",
  finance: "payments",
  staff: "hr",
  reports: "reports",
  settings: "core",
};

// A handful of sub-pages belong to a different module than their parent, so
// they come and go on their own — Accounting Sync disappears from Finance
// without taking the rest of Finance with it.
const ITEM_MODULE: Record<string, ModuleId> = {
  "Accounting Sync": "accounting",
  "Aggregator Channels": "integrations",
  "Integrations": "integrations",
};

// Derived from the route registry so every routed page automatically gets
// sidebar navigation without an edit here.
const ROUTES: Record<string, string> = Object.fromEntries(routes.map((r) => [r.id, r.path]));

// Sidebar sub-items that already have a routed page. Items without an entry
// stay inert placeholders until their page is built.
const ITEM_PATHS: Record<string, string> = {
  "Live Orders (all channels)": "/orders",
  "Order History": "/orders/history",
  "Pre-Orders & Scheduled": "/orders/preorders",
  "Calendar / Timeline": "/reservations/calendar",
  "Floor Plan": "/reservations/floor-plan",
  "Waitlist": "/reservations/waitlist",
  "Private Rooms & Events": "/reservations/events",
  "Categories & Items": "/menu/items",
  "Modifiers": "/menu/modifiers",
  "Combos": "/menu/combos",
  "Price Lists & Channels": "/menu/pricing",
  "Schedules & Ramadan Profile": "/menu/schedules",
  "Availability (86 board)": "/menu/availability",
  "Employees": "/staff/employees",
  "Schedule": "/staff/schedule",
  "Attendance": "/staff/attendance",
  "Tips": "/staff/tips",
  "Payroll Inputs": "/staff/payroll",
  "Customer List & Profiles": "/customers",
  "Segments": "/customers/segments",
  "Feedback & Complaints": "/customers/feedback",
  "Zones": "/delivery/zones",
  "Dispatch Board": "/delivery/dispatch",
  "Drivers": "/delivery/drivers",
  "Aggregator Channels": "/delivery/aggregators",
  "Loyalty Program": "/marketing/loyalty",
  "Gift Cards": "/marketing/gift-cards",
  "Subscriptions & Memberships": "/marketing/subscriptions",
  "Promotions & Vouchers": "/marketing/promotions",
  "Campaigns": "/marketing/campaigns",
  "Payments & Transactions": "/finance/payments",
  "Tax Invoices (ZATCA)": "/finance/tax-invoices",
  "Settlements & Reconciliation": "/finance/settlements",
  "Accounting Sync": "/finance/accounting",
  "House Accounts": "/finance/house-accounts",
  "Ingredients & Suppliers": "/inventory/ingredients",
  "Recipes & Costing": "/inventory/recipes",
  "Purchase Orders & Receipts": "/inventory/purchasing",
  "Stock Counts & Variance": "/inventory/counts",
  "Waste": "/inventory/waste",
  "Transfers": "/inventory/transfers",
  "Production": "/inventory/production",
  "Sales": "/reports/sales",
  "Costs & Margin": "/reports/margin",
  "Channels": "/reports/channels",
  "Customers": "/reports/customers",
  "Compliance": "/reports/compliance",
  "Scheduled Reports": "/reports/scheduled",
  "My Businesses": "/settings/businesses",
  "Business & Legal Entities": "/settings/business",
  "Branches & Sections": "/settings/branches",
  "Devices & Printers": "/settings/devices",
  "Roles & Permissions": "/settings/roles",
  "Tax Profile": "/settings/tax",
  "Restaurant Type & Modules": "/settings/modules",
  "Integrations": "/settings/integrations",
};

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

  return (
    <button
      ref={setRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      title={collapsed ? label : undefined}
      className={clsx(
        "flex w-full items-center gap-2.5 rounded-lg text-start text-[13px] font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-2",
        isActive ? "bg-soft-blue text-ocean-blue" : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      <Icon size={16} className={isActive ? "shrink-0 text-ocean-blue" : "shrink-0 text-[var(--octo-text-faint)]"} />
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {group.items && (
            <ChevronDown size={14} className={clsx("text-[var(--octo-text-faint)] transition-transform duration-300", isOpen && "rotate-180")} />
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
  const bestMatchPath = group.items
    .map((item) => ITEM_PATHS[item])
    .filter((path): path is string => !!path && (activePath === path || activePath.startsWith(path + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div
      className={clsx(
        "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
        open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className="relative ms-[22px] mt-0.5 flex flex-col gap-0.5 border-s border-[var(--octo-border-card)] ps-3 pb-0.5">
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
                "relative rounded-md px-2 py-1.5 text-start text-[12.5px] transition-colors",
                "before:absolute before:start-[-13px] before:top-1/2 before:h-px before:w-2.5 before:bg-[var(--octo-track)]",
                isActive
                  ? "border border-[var(--octo-border-card)] bg-[var(--octo-card)] font-medium text-[var(--octo-text-primary)] shadow-sm"
                  : "text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)]"
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

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 900 : false
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ dashboard: true });
  const [activeGroup, setActiveGroup] = useState("dashboard");
  const [flyout, setFlyout] = useState<{ group: NavGroup; top: number; left: number } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const accountRef = useRef<HTMLDivElement | null>(null);
  const userToggled = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir } = useI18n();
  const { user, signOut } = useAuth();
  const { isModuleEnabled } = useTenantConfig();

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
      setCollapsed(window.innerWidth < 900);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close the account menu on any outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAccountOpen(false);
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
    const match = Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname || (path !== "/" && location.pathname.startsWith(path + "/"))
    );
    if (match) setActiveGroup(match[0]);
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
    if (collapsed) {
      setActiveGroup(group.id);
      const path = ROUTES[group.id];
      if (path) navigate(path);
      group.items ? openFlyout(group) : setFlyout(null);
      return;
    }
    if (group.items) {
      toggle(group.id);
      return;
    }
    setActiveGroup(group.id);
    const path = ROUTES[group.id];
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
        {!collapsed && <GroupItems group={group} open={!!expanded[group.id]} activePath={location.pathname} />}
      </div>
    );
  }

  return (
    <aside
      className={clsx(
        "relative flex shrink-0 flex-col transition-[width]",
        collapsed ? "w-[68px]" : "w-[258px]"
      )}
      onMouseLeave={() => collapsed && setFlyout(null)}
    >
      <div className={clsx("flex items-center py-4", collapsed ? "justify-center px-0" : "justify-between px-4")}>
        <div className="flex items-center gap-2">
          <OctopusMark size={30} />
          {!collapsed && <span className="text-sm font-bold tracking-tight text-[var(--octo-text-primary)]">OCTOPUS</span>}
        </div>
        {!collapsed && (
          <button
            onClick={() => { userToggled.current = true; setCollapsed(true); }}
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]"
            aria-label={t("sidebar.collapse")}
          >
            <PanelLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => { userToggled.current = true; setCollapsed(false); }}
          className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]"
          aria-label={t("sidebar.expand")}
        >
          <Search size={15} />
        </button>
      )}

      <nav className="octo-scroll flex-1 overflow-y-auto overflow-x-visible px-2 pb-2">
        {visibleSections.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--octo-text-faint)]">
                {t(labelKey(section.label))}
              </p>
            )}
            {section.groups.map(renderGroup)}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--octo-border-card)] px-2 pt-2">
        {visibleFooterGroups.map(renderGroup)}
      </div>

      <div className={clsx("flex items-center gap-2.5 border-t border-[var(--octo-border-card)] py-3", collapsed ? "justify-center px-0" : "px-4")}>
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-deep-navy text-xs font-semibold text-white">
          AR
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">Al Bahri Group</p>
              <p className="truncate text-[11px] text-[var(--octo-text-muted)]">owner@albahri.sa</p>
            </div>
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-label={t("sidebar.accountMenu")}
                aria-expanded={accountOpen}
                className={clsx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-md text-[var(--octo-text-faint)] hover:bg-[var(--octo-hover)]",
                  accountOpen && "bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]"
                )}
              >
                <MoreVertical size={14} />
              </button>

              {accountOpen && (
                <div className="absolute bottom-full start-0 z-50 mb-1.5 w-56 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-lg">
                  <div className="border-b border-[var(--octo-divider)] px-2 pb-2 pt-1">
                    <p className="truncate text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                      {user?.name ?? "Merchant"}
                    </p>
                    <p className="truncate text-[11px] text-[var(--octo-text-muted)]">{user?.email ?? ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccountOpen(false)}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[12.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                  >
                    <HelpCircle size={13} />
                    {t("sidebar.helpSupport")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      signOut();
                    }}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-[12.5px] font-medium text-[#EF4444] hover:bg-red-50"
                  >
                    <LogOut size={13} />
                    {t("common.signOut")}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {collapsed && flyout && (
        <div
          className="fixed z-50 w-56 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2 shadow-lg"
          style={{ top: flyout.top, left: flyout.left }}
          onMouseEnter={() => setFlyout(flyout)}
        >
          <p className="mb-1 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--octo-text-faint)]">
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
              className="w-full rounded-md px-2 py-1.5 text-start text-[12.5px] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)] hover:text-[var(--octo-text-primary)]"
            >
              {t(labelKey(item))}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
