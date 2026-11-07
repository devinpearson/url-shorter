import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, type CurrentUser } from "./api";

interface AuthState {
  /** `undefined` while the first check is in flight. */
  user: CurrentUser | null | undefined;
}

const AuthContext = createContext<AuthState>({ user: undefined });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && setUser(null));
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook lives beside its provider
export function useAuth() {
  return useContext(AuthContext);
}
