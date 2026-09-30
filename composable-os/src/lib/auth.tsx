import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearToken, setToken, getToken } from "@/lib/api";
import i18n, { setLocale } from "@/i18n";

// ── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  workspace_id: string;
  is_active?: boolean;
  is_owner?: boolean;
  /** Lo guardado: `null` significa "sigue al workspace". */
  locale?: string | null;
  /** Lo que se debe usar, ya resuelto por el servidor (ADR 0016). */
  effective_locale?: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  /** Cambia el idioma y, con sesion, lo guarda en el servidor. */
  changeLocale: (locale: string) => Promise<void>;
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
  changeLocale: async () => {},
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

  // Con sesion manda el servidor. `/auth/me` devuelve el locale efectivo ya
  // resuelto (ADR 0016), asi que el cliente no reimplementa esa cadena: solo la
  // aplica. Sin usuario (login) vale lo detectado al arrancar.
  useEffect(() => {
    if (user?.effective_locale) void setLocale(user.effective_locale);
  }, [user?.effective_locale]);

  const changeLocale = async (locale: string) => {
    const previous = i18n.language;
    const applied = await setLocale(locale);
    if (!user) return;

    try {
      setUser(await api.patch<User>("/auth/me", { locale: applied }));
    } catch (err) {
      // El servidor la rechazo o no respondio: la interfaz no debe quedarse
      // en un idioma que no quedo guardado.
      await setLocale(previous);
      throw err;
    }
  };

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
    <AuthContext.Provider value={{ user, loading, login, register, logout, changeLocale }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
