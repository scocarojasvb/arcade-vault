"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

type Status = "checking" | "ready" | "invalid";

export default function ActualizarClavePage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "ready" : "invalid");
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "No se pudo actualizar la contraseña, intenta de nuevo.");
      return;
    }

    router.push("/biblioteca");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">NUEVA CONTRASEÑA</h2>
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

        {status === "checking" && (
          <p style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
            Verificando enlace…
          </p>
        )}

        {status === "invalid" && (
          <>
            <p
              style={{
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              Este enlace de recuperación no es válido o ya expiró.
            </p>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Link href="/auth/recuperar" className="btn ghost" style={{ width: "100%" }}>
                SOLICITAR UN NUEVO ENLACE
              </Link>
            </div>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Contraseña nueva</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="field">
              <label>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "GUARDANDO…" : "GUARDAR CONTRASEÑA"}
            </button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
