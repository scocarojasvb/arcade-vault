"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth-context";

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (name: "inicio" | "biblioteca" | "salon" | "acerca-de" | "auth") => {
    if (name === "inicio") return pathname === "/";
    if (name === "biblioteca") return pathname === "/biblioteca" || pathname.startsWith("/juego/");
    if (name === "salon") return pathname === "/salon-de-la-fama";
    if (name === "acerca-de") return pathname === "/acerca-de";
    return pathname === "/auth";
  };

  const close = () => setOpen(false);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  const handleLogout = async () => {
    setAccountOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("inicio") ? "active" : ""}>
            Inicio
          </Link>
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon-de-la-fama" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("acerca-de") ? "active" : ""}>
            Sobre nosotros
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <div className="account-menu" ref={accountMenuRef}>
            <button
              className="btn ghost auth-btn"
              onClick={() => setAccountOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
            >
              {user.name} ▾
            </button>
            {accountOpen && (
              <div className="account-dropdown" role="menu">
                <div className="account-dropdown-email mono">{user.email}</div>
                <button className="account-dropdown-item" role="menuitem" onClick={handleLogout}>
                  CERRAR SESIÓN
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isActive("inicio") ? "active" : ""} onClick={close}>
          Inicio
        </Link>
        <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""} onClick={close}>
          Biblioteca
        </Link>
        <Link
          href="/salon-de-la-fama"
          className={isActive("salon") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link href="/acerca-de" className={isActive("acerca-de") ? "active" : ""} onClick={close}>
          Sobre nosotros
        </Link>
        {user ? (
          <>
            <div className="av-mobile-account mono">{user.name}</div>
            <button
              className="av-mobile-logout"
              onClick={() => {
                handleLogout();
                close();
              }}
            >
              CERRAR SESIÓN
            </button>
          </>
        ) : (
          <Link href="/auth" className={isActive("auth") ? "active" : ""} onClick={close}>
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
