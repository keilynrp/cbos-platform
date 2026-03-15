import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Search, Bell, LogOut, CheckCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/useNotifications";

export function AppLayout() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  const userInitials = user?.full_name
    ? user.full_name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "U";

  const handleNotifOpen = (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) markAllRead();
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "ahora";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="relative hidden sm:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search everything..."
                  className="pl-9 w-64 h-9 bg-muted/50 border-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Popover open={notifOpen} onOpenChange={handleNotifOpen}>
                <PopoverTrigger asChild>
                  <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={markAllRead}>
                        <CheckCheck className="h-3 w-3" /> Marcar todas
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">
                        Sin notificaciones
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 transition-colors ${n.read ? "" : "bg-primary/5"}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {n.event_type} · {timeAgo(n.timestamp)}
                            </p>
                          </div>
                          <button
                            onClick={() => dismiss(n.id)}
                            className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              {/* User avatar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{user?.full_name ?? "Usuario"}</p>
                  <p className="text-xs opacity-70">{user?.email}</p>
                </TooltipContent>
              </Tooltip>

              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cerrar sesión</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
