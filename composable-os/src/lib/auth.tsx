import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearToken, setToken, getToken } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  workspace_id: string;
  is_active?: boolean;
  is_owner?: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export interface RegisterData {
  workspace_name: string;
  workspace_slug: string;
  full_name: string;
  email: string;
  password: string;
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session if token exists
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.get<User>("/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string }>(
      "/auth/login",
      { email, password }
    );
    setToken(data.access_token);
    const me = await api.get<User>("/auth/me");
    setUser(me);
  };

  const register = async (data: RegisterData) => {
    const resp = await api.post<{ access_token: string }>("/auth/register", data);
    setToken(resp.access_token);
    const me = await api.get<User>("/auth/me");
    setUser(me);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
