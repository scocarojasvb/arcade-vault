"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../../auth-context";

export default function RecuperarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/biblioteca");
    }
  }, [authLoading, user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/actualizar-clave`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "No se pudo enviar el correo, intenta de nuevo.");
      return;
    }

    setSent(true);
  };

  if (authLoading || user) {
    return null;
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">RECUPERAR CONTRASEÑA</h2>
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

        {sent ? (
          <p
            style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.6 }}
          >
            Si existe una cuenta con <strong>{email}</strong>, te enviamos un correo con
            instrucciones para restablecer tu contraseña.
          </p>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
            <button
              className="btn lg"
              type="submit"
              style={{ width: "100%", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? "ENVIANDO…" : "ENVIAR ENLACE"}
            </button>
            {error && <p className="auth-error">{error}</p>}
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/auth" className="mono" style={{ fontSize: 11, color: "var(--cyan)" }}>
            ← Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
