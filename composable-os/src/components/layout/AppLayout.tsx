import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Search, Bell, LogOut, CheckCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    : user?.email?.slice(0, 2).toUpperCase() ?? "U";

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
          <header className="h-14 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 bg-white dark:bg-gray-900 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en la plataforma..."
                  className="pl-9 w-64 h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm rounded-lg focus-visible:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <Popover open={notifOpen} onOpenChange={handleNotifOpen}>
                <PopoverTrigger asChild>
                  <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 transition-colors">
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-3.5 w-3.5 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-bold leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {notifications.length > 0 && (
                      <button className="flex items-center gap-1 h-6 px-2 text-xs text-primary hover:underline" onClick={markAllRead}>
                        <CheckCheck className="h-3 w-3" /> Marcar todas
                      </button>
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

              {/* User avatar + name */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                      {user?.full_name ?? "Usuario"}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{user?.full_name ?? "Usuario"}</p>
                  <p className="text-xs opacity-70">{user?.email}</p>
                </TooltipContent>
              </Tooltip>

              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
                    onClick={logout}
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
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
