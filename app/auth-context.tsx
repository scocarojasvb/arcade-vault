"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "./lib/supabase/client";

export interface User {
  id: string; // auth.users.id (uuid), viene de la sesión real de Supabase
  email: string;
  name: string; // nickname, leído de user_metadata.name
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser || !supabaseUser.email) return null;
  const metaName =
    typeof supabaseUser.user_metadata?.name === "string" ? supabaseUser.user_metadata.name : "";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: metaName || supabaseUser.email.split("@")[0],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(toUser(data.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toUser(session?.user ?? null));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  const saveScore = (entry: Omit<SavedScore, "at">) => {
    const supabase = createClient();
    supabase
      .from("scores")
      .insert({
        game_id: entry.game,
        name: entry.name,
        score: entry.score,
        user_id: user?.id ?? null,
      })
      .then(({ error }) => {
        if (error) console.error("saveScore: insert failed", error);
      });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, saveScore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
