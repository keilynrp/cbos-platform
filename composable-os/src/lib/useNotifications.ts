import { useEffect, useRef, useState, useCallback } from "react";
import { getToken } from "@/lib/api";

export interface AppNotification {
  id: string;
  event_type: string;
  title: string;
  payload: Record<string, unknown>;
  entity_id: string | null;
  timestamp: string;
  read: boolean;
}

const WS_BASE = (import.meta.env.VITE_API_URL as string ?? "http://localhost:8100/api/v1")
  .replace(/^http/, "ws")
  .replace(/\/api\/v1\/?$/, "/api/v1");

let idCounter = 0;

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const url = `${WS_BASE}/ws/notifications?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== "notification") return;
        setNotifications((prev) => [
          {
            id: String(++idCounter),
            event_type: msg.event_type,
            title: msg.title,
            payload: msg.payload ?? {},
            entity_id: msg.entity_id ?? null,
            timestamp: msg.timestamp ?? new Date().toISOString(),
            read: false,
          },
          ...prev.slice(0, 49), // máximo 50
        ]);
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      // Reconectar tras 3s si no fue intencional
      reconnectTimer.current = setTimeout(connect, 3_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { notifications, unreadCount, markAllRead, dismiss };
}
