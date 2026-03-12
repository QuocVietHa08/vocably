import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/src/lib/supabase';

/* ─── Types ───────────────────────────────────────────────────── */

interface AuthContextValue {
  user:              User | null;
  session:           Session | null;
  loading:           boolean;
  signInWithGoogle:  () => Promise<void>;
  signInWithApple:   () => Promise<void>;
  signOut:           () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:             null,
  session:          null,
  loading:          false,
  signInWithGoogle: async () => {},
  signInWithApple:  async () => {},
  signOut:          async () => {},
});

/* ─── Provider ────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);

  // TODO: re-enable when Supabase is configured
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data }) => {
  //     setSession(data.session);
  //     setLoading(false);
  //   });
  //   const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
  //     setSession(newSession);
  //   });
  //   return () => listener.subscription.unsubscribe();
  // }, []);

  // TODO: re-enable OAuth sign-in when expo-web-browser + expo-auth-session are set up
  async function signInWithGoogle() {}
  async function signInWithApple()  {}
  async function signOut()          { await supabase.auth.signOut(); }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signInWithGoogle, signInWithApple, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────────────────── */
export function useAuth() {
  return useContext(AuthContext);
}
