import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { type CurrentUser, fetchCurrentUser } from "./api";

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

export function useAuth() {
  return useContext(AuthContext);
}
