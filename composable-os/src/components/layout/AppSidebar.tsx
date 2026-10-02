import {
  LayoutDashboard, Users, BarChart3, Settings, Blocks, Sun, Moon,
  PanelTop, Receipt, Zap, PackageSearch, Search, FileText, ScrollText, FolderKanban, UserCog,
  ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/useT";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

// ── Nav structure ──────────────────────────────────────────────────────────
interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}
interface NavSection {
  /** Identificador estable: la clave de React y de pruebas, no el texto. */
  id: string;
  label: string;
  items: NavItem[];
}

function buildNavSections(t: ReturnType<typeof useT>): NavSection[] {
  return [
    {
      id: "main",
      label: "",
      items: [
        { title: t("layout:nav.items.dashboard"), url: "/", icon: LayoutDashboard },
      ],
    },
    {
      id: "commerce",
      label: t("layout:nav.sections.commerce"),
      items: [
        { title: t("layout:nav.items.crm"),       url: "/crm",            icon: Users },
        { title: t("layout:nav.items.sales"),     url: "/sales",          icon: Receipt },
        { title: t("layout:nav.items.inventory"), url: "/inventory",      icon: PackageSearch },
        { title: t("layout:nav.items.portal"),    url: "/portal-builder", icon: PanelTop },
        { title: t("layout:nav.items.invoicing"), url: "/invoicing",      icon: FileText },
        { title: t("layout:nav.items.contracts"), url: "/contracts",      icon: ScrollText },
        { title: t("layout:nav.items.projects"),  url: "/projects",       icon: FolderKanban },
        { title: t("layout:nav.items.team"),      url: "/hr",             icon: UserCog },
      ],
    },
    {
      id: "operations",
      label: t("layout:nav.sections.operations"),
      items: [
        { title: t("layout:nav.items.workflows"), url: "/workflows", icon: Zap },
        { title: t("layout:nav.items.discovery"), url: "/discovery", icon: Search },
        { title: t("layout:nav.items.analytics"), url: "/analytics", icon: BarChart3 },
      ],
    },
    {
      id: "system",
      label: t("layout:nav.sections.system"),
      items: [
        { title: t("layout:nav.items.settings"), url: "/settings", icon: Settings },
      ],
    },
  ];
}

// ── NavItem component ──────────────────────────────────────────────────────
function NavItemEl({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  const inner = (
    <NavLink
      to={item.url}
      end={item.url === "/"}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 outline-none",
        active
          ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200",
        collapsed && "justify-center px-2",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          active
            ? "text-primary"
            : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300",
        )}
      />
      {!collapsed && (
        <span className="truncate flex-1">{item.title}</span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

// ── AppSidebar ─────────────────────────────────────────────────────────────
export function AppSidebar() {
  const t = useT();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const navSections = buildNavSections(t);
  const themeLabel = isDark ? t("layout:sidebar.lightMode") : t("layout:sidebar.darkMode");
  const collapseLabel = collapsed ? t("layout:sidebar.expand") : t("layout:sidebar.collapse");

  function isActive(url: string) {
    return url === "/" ? location.pathname === "/" : location.pathname.startsWith(url);
  }

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon" className="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">

        {/* ── Header ──────────────────────────────────────────── */}
        <SidebarHeader className="px-4 py-5">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            {/* Logo mark */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-theme-sm">
              <Blocks className="h-5 w-5" />
            </div>

            {/* Brand text */}
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                  CBOS</span> {/* i18n-ok: nombre del producto */}
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {t("layout:brand.tagline")}
                </span>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* ── Nav ─────────────────────────────────────────────── */}
        <SidebarContent className="overflow-y-auto overflow-x-hidden px-3 pb-4 [scrollbar-width:thin] [scrollbar-color:theme(colors.gray.200)_transparent] dark:[scrollbar-color:theme(colors.gray.800)_transparent]">
          {navSections.map((section) => (
            <div key={section.id} className="mb-1">
              {/* Section label */}
              {section.label && !collapsed && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                  {section.label}
                </p>
              )}
              {/* Spacer when collapsed (no labels) */}
              {section.label && collapsed && (
                <div className="my-1 mx-2 border-t border-gray-100 dark:border-gray-800" />
              )}

              {/* Items */}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.url}>
                    <NavItemEl
                      item={item}
                      active={isActive(item.url)}
                      collapsed={collapsed}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </SidebarContent>

        {/* ── Footer ──────────────────────────────────────────── */}
        <SidebarFooter className="border-t border-gray-100 dark:border-gray-800 px-3 py-3">
          <div className={cn("flex items-center gap-2", collapsed ? "flex-col" : "flex-row justify-between")}>
            {/* Theme toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  aria-label={themeLabel}
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
                >
                  {isDark ? (
                    <Sun className="h-[18px] w-[18px]" />
                  ) : (
                    <Moon className="h-[18px] w-[18px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"} className="text-xs">
                {themeLabel}
              </TooltipContent>
            </Tooltip>

            {/* Collapse toggle */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  aria-label={collapseLabel}
                  onClick={toggleSidebar}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300 transition-colors"
                >
                  {collapsed ? (
                    <ChevronRight className="h-[18px] w-[18px]" />
                  ) : (
                    <ChevronLeft className="h-[18px] w-[18px]" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? "right" : "top"} className="text-xs">
                {collapseLabel}
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
