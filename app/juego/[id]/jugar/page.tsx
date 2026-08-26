"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GAMES, fetchGame, type Game } from "../../../data/games";
import { useAuth } from "../../../auth-context";
import { REAL_GAME_IDS } from "../../../data/real-games";
import { REAL_GAME_COMPONENTS, type RealGameState } from "../../../games/registry";
import {
  DEFAULT_SKIN,
  SKIN_IDS,
  SKIN_LABELS,
  isSkinId,
  skinStorageKey,
  type SkinId,
} from "../../../games/skins";
import { useIsTouchDevice } from "../../../games/use-is-touch-device";
import TouchControls from "../../../games/touch-controls";

/**
 * Store externo mínimo para la skin elegida, persistida por juego en localStorage
 * (clave `av_skin_<id>`, nunca global). Se lee con useSyncExternalStore para que el
 * render del servidor use siempre DEFAULT_SKIN y la hidratación no rompa —
 * mismo motivo por el que `app/auth-context.tsx` no lee localStorage en el
 * inicializador de useState.
 */
const skinListeners = new Set<() => void>();
const skinFallback = new Map<string, SkinId>();

function subscribeSkin(onStoreChange: () => void) {
  skinListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    skinListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readSkin(gameId: string): SkinId {
  try {
    const stored = window.localStorage.getItem(skinStorageKey(gameId));
    if (isSkinId(stored)) return stored;
  } catch {
    /* localStorage no disponible */
  }
  return skinFallback.get(gameId) ?? DEFAULT_SKIN;
}

function writeSkin(gameId: string, next: SkinId) {
  skinFallback.set(gameId, next);
  try {
    window.localStorage.setItem(skinStorageKey(gameId), next);
  } catch {
    /* localStorage no disponible: queda solo en memoria */
  }
  skinListeners.forEach((notify) => notify());
}

export default function GamePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, saveScore } = useAuth();
  const isRealGame = (REAL_GAME_IDS as readonly string[]).includes(id);
  const [realGame, setRealGame] = useState<Game | null>(null);
  const game = isRealGame ? realGame : GAMES.find((g) => g.id === id);

  useEffect(() => {
    if (isRealGame) fetchGame(id).then(setRealGame);
  }, [id, isRealGame]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState<number | undefined>(3);
  const [lines, setLines] = useState<number | undefined>(undefined);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [guestName, setGuestName] = useState("INVITADO");
  const name = user ? user.name : guestName;
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const skin = useSyncExternalStore(
    subscribeSkin,
    () => readSkin(id),
    () => DEFAULT_SKIN,
  );
  const chooseSkin = (next: SkinId) => writeSkin(id, next);
  const isTouchDevice = useIsTouchDevice();

  useEffect(() => {
    if (isRealGame || over || paused) return;
    const t = setInterval(() => {
      setScore((s) => {
        const next = s + Math.floor(10 + Math.random() * 90);
        if (next % 2500 < s % 2500) setLevel((l) => l + 1);
        return next;
      });
    }, 220);
    return () => clearInterval(t);
  }, [isRealGame, over, paused]);

  if (!game) return null;

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setLines(undefined);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setAttempt((a) => a + 1);
  };

  const handleStateChange = (state: RealGameState) => {
    setScore(state.score);
    setLevel(state.level);
    setLives(state.lives);
    setLines(state.lines);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setOver(true);
  };

  const RealGameComponent = isRealGame ? REAL_GAME_COMPONENTS[id] : undefined;

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {lines !== undefined ? (
            <div className="hud-stat lines">
              <div className="l">Líneas</div>
              <div className="v">{lines}</div>
            </div>
          ) : (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives ?? 0).trim() || "—"}</div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {RealGameComponent && (
            <div className="hud-skin">
              <span className="l">Skin</span>
              {SKIN_IDS.map((s) => (
                <button
                  key={s}
                  className="skin-chip"
                  aria-pressed={skin === s}
                  onClick={() => chooseSkin(s)}
                >
                  {SKIN_LABELS[s]}
                </button>
              ))}
            </div>
          )}
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juego/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-viewport">
            {RealGameComponent ? (
              <RealGameComponent
                key={attempt}
                paused={paused}
                skin={skin}
                onStateChange={handleStateChange}
                onGameOver={handleGameOver}
              />
            ) : (
              <div className="game-arena">
                <div className="grid-floor"></div>
                <div className="enemy e1"></div>
                <div className="enemy e2"></div>
                <div className="enemy e3"></div>
                <div className="player-ship"></div>
              </div>
            )}
            {paused && (
              <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
                <div>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                    EN PAUSA
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-dim)",
                      marginTop: 10,
                      letterSpacing: "0.16em",
                    }}
                  >
                    PULSA REANUDAR PARA CONTINUAR
                  </div>
                </div>
              </div>
            )}
          </div>
          {RealGameComponent && isTouchDevice && <TouchControls />}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              user === null ? (
                <div className="input-row">
                  <Link href="/auth" className="btn yellow">
                    INICIAR SESIÓN PARA GUARDAR
                  </Link>
                </div>
              ) : (
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) => setGuestName(e.target.value.toUpperCase().slice(0, 10))}
                    placeholder="TUS INICIALES"
                    disabled={!!user}
                  />
                  <button
                    className="btn yellow"
                    onClick={() => {
                      saveScore({ game: game.id, score, name });
                      setSaved(true);
                    }}
                  >
                    GUARDAR PUNTUACIÓN
                  </button>
                </div>
              )
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/biblioteca" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
