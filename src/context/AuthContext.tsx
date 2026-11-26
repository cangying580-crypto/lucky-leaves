import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { backend, isCloud } from '../lib/backend';
import type { Session } from '../types';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nickname: string, birthYear: number) => Promise<void>;
  signOut: () => Promise<void>;
  demoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isCloud) await backend.ensureDemo();
        const s = await backend.restoreSession();
        if (alive) setSession(s);
      } catch {
        if (alive) setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await backend.signIn(email, password));
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, nickname: string, birthYear: number) => {
      setSession(await backend.signUp(email, password, nickname, birthYear));
    },
    [],
  );

  const signOut = useCallback(async () => {
    await backend.signOut();
    setSession(null);
  }, []);

  const demoLogin = useCallback(async () => {
    const cred = backend.demoCredentials;
    if (!cred) throw new Error('云端模式不提供演示账号');
    setSession(await backend.signIn(cred.email, cred.password));
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}