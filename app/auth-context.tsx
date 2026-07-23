"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface User {
  name: string;
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

interface AuthContextValue {
  user: User | null;
  scores: SavedScore[];
  login: (user: User) => void;
  logout: () => void;
  saveScore: (entry: Omit<SavedScore, "at">) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [scores, setScores] = useState<SavedScore[]>([]);

  useEffect(() => {
    try {
      setUser(JSON.parse(localStorage.getItem("av_user") || "null"));
    } catch {
      setUser(null);
    }
    try {
      setScores(JSON.parse(localStorage.getItem("av_scores") || "[]"));
    } catch {
      setScores([]);
    }
  }, []);

  const login = (u: User) => {
    setUser(u);
    try {
      localStorage.setItem("av_user", JSON.stringify(u));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("av_user");
    } catch {}
  };

  const saveScore = (entry: Omit<SavedScore, "at">) => {
    const next = [...scores, { ...entry, at: Date.now() }];
    setScores(next);
    try {
      localStorage.setItem("av_scores", JSON.stringify(next));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, scores, login, logout, saveScore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
