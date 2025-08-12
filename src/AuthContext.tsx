import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { AuthContext } from "./AuthContextBase";
import type { AuthContextType } from "./AuthContextBase";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthContextType["session"]>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth 훅은 별도 파일(src/useAuth.tsx)로 분리 필요 (Fast Refresh 오류 방지)
