"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";

const AuthContext = createContext({ user: null, loading: true, client: null });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const client = getSupabaseClient();

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }

    client.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Could not read the Supabase session.", error);
      setUser(data?.session?.user || null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  return (
    <AuthContext.Provider value={{ user, loading, client }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
