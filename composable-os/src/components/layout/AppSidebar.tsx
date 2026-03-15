import {
  LayoutDashboard, FolderKanban, Users, Share2, FileText,
  BarChart3, Bot, Store, Settings, Blocks, Sun, Moon, PanelTop, Landmark, ShoppingBag, GitBranch, MessageSquare, UserCircle, Crosshair, Magnet, Calendar, Layers, CalendarClock, Cable, Monitor, PackageSearch, Warehouse, Cpu, Network, FileSignature, Receipt, Map, Brain, Zap
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Knowledge Graph", url: "/knowledge", icon: Share2 },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "AI Agents", url: "/ai-agents", icon: Bot },
  { title: "Chatbot Builder", url: "/chatbot-builder", icon: MessageSquare },
  { title: "Marketplace", url: "/marketplace", icon: Store },
  { title: "Portal Builder", url: "/portal-builder", icon: PanelTop },
  { title: "Shop Builder", url: "/shop-builder", icon: ShoppingBag },
  { title: "RevPath Intelligence", url: "/revpath", icon: GitBranch },
  { title: "Persona Builder", url: "/persona-builder", icon: UserCircle },
  { title: "Prospecting", url: "/prospecting", icon: Crosshair },
  { title: "Lead Magnets", url: "/lead-magnets", icon: Magnet },
  { title: "Events", url: "/events", icon: Calendar },
  { title: "Experience Mapper", url: "/experience-mapper", icon: Layers },
  { title: "Appointments", url: "/appointments", icon: CalendarClock },
  { title: "MCP Hub", url: "/mcp-hub", icon: Cable },
  { title: "POS Builder", url: "/pos-builder", icon: Monitor },
  { title: "Inventory & Orders", url: "/inventory-orders", icon: PackageSearch },
  { title: "Warehouse", url: "/warehouse", icon: Warehouse },
  { title: "IoT Builder", url: "/iot-builder", icon: Cpu },
  { title: "System Modeler", url: "/system-modeler", icon: Network },
  { title: "Contract Studio", url: "/contract-studio", icon: FileSignature },
  { title: "Workflows", url: "/workflows", icon: Zap },
  { title: "Sales Builder", url: "/sales-builder", icon: Receipt },
  { title: "Platform Map", url: "/platform-map", icon: Map },
  { title: "Team Structure", url: "/team-structure", icon: Users },
  { title: "Intelligence Graph", url: "/intelligence-graph", icon: Brain },
  { title: "Accounts", url: "/accounts", icon: Landmark },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Blocks className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col flex-1">
              <span className="text-sm font-bold tracking-tight">Composable OS</span>
              <span className="text-[10px] text-muted-foreground">Business Platform</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={toggleTheme}
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={
                    item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url)
                  }>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
