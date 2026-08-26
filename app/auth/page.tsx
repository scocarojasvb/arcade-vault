"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../lib/supabase/client";

type ErrorKind = "invalid" | "unconfirmed" | "generic";
type ResendState = "idle" | "sending" | "sent";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [resendState, setResendState] = useState<ResendState>("idle");

  const switchTab = (next: "in" | "up") => {
    setTab(next);
    setError(null);
    setErrorKind(null);
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorKind(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });

    setLoading(false);

    if (authError) {
      if (authError.code === "email_not_confirmed") {
        setError("Todavía no confirmaste tu correo.");
        setErrorKind("unconfirmed");
      } else {
        setError("Correo o contraseña inválidos.");
        setErrorKind("invalid");
      }
      return;
    }

    router.push("/biblioteca");
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorKind(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { name: (nickname || "PLAYER1").toUpperCase().slice(0, 10) } },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message || "No se pudo crear la cuenta, intenta de nuevo.");
      setErrorKind("generic");
      return;
    }

    setResendState("idle");
    setAwaitingConfirmation(true);
  };

  const resendConfirmation = async () => {
    setResendState("sending");
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setResendState(resendError ? "idle" : "sent");
  };

  const oauth = async (provider: "google" | "github") => {
    setError(null);
    setErrorKind(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError("No se pudo iniciar sesión, intenta de nuevo.");
      setErrorKind("generic");
    }
  };

  const playAsGuest = () => {
    router.push("/biblioteca");
  };

  if (awaitingConfirmation) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark"></div>
            <h2 className="neon-cyan">REVISÁ TU CORREO</h2>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                letterSpacing: "0.16em",
                marginTop: 6,
              }}
            >
              ACCESO AL SISTEMA · v2.6
            </div>
          </div>

          <p
            style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6 }}
          >
            Te enviamos un correo de confirmación a <strong>{email}</strong>. Hacé clic en el enlace
            para activar tu cuenta antes de iniciar sesión.
          </p>

          <button
            className="btn ghost"
            style={{ width: "100%", marginTop: 16 }}
            type="button"
            onClick={resendConfirmation}
            disabled={resendState === "sending"}
          >
            {resendState === "sent"
              ? "CORREO REENVIADO ✓"
              : resendState === "sending"
                ? "REENVIANDO…"
                : "REENVIAR CONFIRMACIÓN"}
          </button>

          <button
            className="btn"
            style={{ width: "100%", marginTop: 10 }}
            type="button"
            onClick={() => {
              setAwaitingConfirmation(false);
              switchTab("in");
            }}
          >
            VOLVER A INICIAR SESIÓN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button className={tab === "in" ? "on" : ""} onClick={() => switchTab("in")}>
            INICIAR SESIÓN
          </button>
          <button className={tab === "up" ? "on" : ""} onClick={() => switchTab("up")}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={tab === "in" ? login : signup}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {tab === "in" && (
            <div style={{ textAlign: "right", marginBottom: 8 }}>
              <Link
                href="/auth/recuperar"
                className="mono"
                style={{ fontSize: 11, color: "var(--cyan)" }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          )}

          <button
            className="btn lg"
            type="submit"
            style={{ width: "100%", marginTop: 8 }}
            disabled={loading}
          >
            {loading ? "PROCESANDO…" : tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>

          {error && (
            <div>
              <p className="auth-error">{error}</p>
              {errorKind === "unconfirmed" && (
                <button
                  className="btn ghost"
                  type="button"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={resendConfirmation}
                  disabled={resendState === "sending"}
                >
                  {resendState === "sent"
                    ? "CORREO REENVIADO ✓"
                    : resendState === "sending"
                      ? "REENVIANDO…"
                      : "REENVIAR CONFIRMACIÓN"}
                </button>
              )}
            </div>
          )}
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button className="btn ghost" type="button" onClick={() => oauth("google")}>
            ◆ GOOGLE
          </button>
          <button className="btn ghost" type="button" onClick={() => oauth("github")}>
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
