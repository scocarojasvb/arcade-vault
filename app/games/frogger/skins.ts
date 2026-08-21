import type { SkinId } from "../skins";

/**
 * Paleta de Frogger. Juego 100% vectorial (sin spritesheet): cada campo es un rol
 * de dibujo exactamente donde antes había un literal de color.
 *
 * - `classic` reproduce valor por valor los colores originales del juego
 *   (línea base de regresión: no debe cambiar ni un píxel).
 * - `neon` usa solo los tokens de acento de globals.css (--cyan #00f5ff,
 *   --magenta #ff006e, --yellow #f5ff00, --green #00ff88) más --bg/--ink, con el
 *   cyan como acento principal (color de catálogo de frogger). Los fondos de
 *   carril son esos mismos tokens con alpha bajo, no tonos nuevos.
 * - `retro` es fósforo CRT ámbar monocromo de 4 tonos
 *   (#1a1206 / #c04000 / #ff7b00 / #ffb000), sin glow. Los fondos de carril son
 *   washes con alpha de esos mismos tonos sobre el fondo, no un 5º tono.
 */
export interface FroggerSkin {
  /** Fondo del canvas. */
  bg: string;
  /** Franja de nenúfares (fila objetivo). */
  laneGoal: string;
  /** Fondo de los 5 carriles de río. */
  laneRiver: string;
  /** Fondo de las franjas seguras (mediana y fila de aparición). */
  laneSafe: string;
  /** Fondo de los 5 carriles de carretera. */
  laneRoad: string;
  /** Línea discontinua central de cada carril de carretera. */
  roadMarking: string;
  /** Troncos del río. */
  log: string;
  /** Tortugas emergidas. */
  turtle: string;
  /** Tortugas sumergidas (mismo tono con alpha). */
  turtleSubmerged: string;
  /** Un color por carril de carretera (5 carriles). */
  vehicles: readonly string[];
  /** Nenúfares de la fila objetivo (relleno si ocupado, contorno si libre). */
  lilypad: string;
  /** Cuerpo de la rana. */
  frog: string;
  /** Ojos de la rana. */
  frogEye: string;
  /** Fondo de la franja inferior de HUD dentro del canvas. */
  hudStrip: string;
  /** Canal vacío de la barra de tiempo. */
  hudTrack: string;
  /** Texto del HUD dibujado en canvas ("NENÚFARES"). */
  hudText: string;
  /** Barra de tiempo con más del 50% restante. */
  timerHigh: string;
  /** Barra de tiempo entre el 20% y el 50%. */
  timerMid: string;
  /** Barra de tiempo por debajo del 20%. */
  timerLow: string;
  /** Marcador de nenúfar aún no ocupado en la franja de HUD. */
  padChipEmpty: string;
  /** ctx.shadowBlur de troncos, tortugas, nenúfar libre y barra de tiempo. */
  glowPlatform: number;
  /** ctx.shadowBlur de los vehículos. */
  glowVehicle: number;
  /** ctx.shadowBlur de la rana y del nenúfar ocupado. */
  glowActor: number;
}

export const FROGGER_SKINS: Record<SkinId, FroggerSkin> = {
  classic: {
    bg: "#0a0a0f",
    laneGoal: "#04141c",
    laneRiver: "#061c2a",
    laneSafe: "#0d2a18",
    laneRoad: "#141420",
    roadMarking: "rgba(245, 255, 0, 0.35)",
    log: "#00f5ff",
    turtle: "#00ff88",
    turtleSubmerged: "rgba(0, 255, 136, 0.25)",
    vehicles: ["#ff006e", "#f5ff00", "#00f5ff", "#00ff88", "#ff006e"],
    lilypad: "#00ff88",
    frog: "#00ff88",
    frogEye: "#0a0a0f",
    hudStrip: "#0f0f18",
    hudTrack: "rgba(255, 255, 255, 0.08)",
    hudText: "#e6e9ff",
    timerHigh: "#00ff88",
    timerMid: "#f5ff00",
    timerLow: "#ff006e",
    padChipEmpty: "rgba(0, 255, 136, 0.15)",
    glowPlatform: 6,
    glowVehicle: 8,
    glowActor: 10,
  },
  neon: {
    bg: "#0a0a0f",
    laneGoal: "rgba(0, 245, 255, 0.14)",
    laneRiver: "rgba(0, 245, 255, 0.09)",
    laneSafe: "rgba(0, 255, 136, 0.12)",
    laneRoad: "rgba(230, 233, 255, 0.06)",
    roadMarking: "rgba(245, 255, 0, 0.45)",
    log: "#00f5ff",
    turtle: "#00ff88",
    turtleSubmerged: "rgba(0, 255, 136, 0.25)",
    vehicles: ["#ff006e", "#f5ff00", "#ff006e", "#f5ff00", "#ff006e"],
    lilypad: "#00f5ff",
    frog: "#00ff88",
    frogEye: "#0a0a0f",
    hudStrip: "#0a0a0f",
    hudTrack: "rgba(230, 233, 255, 0.10)",
    hudText: "#e6e9ff",
    timerHigh: "#00ff88",
    timerMid: "#f5ff00",
    timerLow: "#ff006e",
    padChipEmpty: "rgba(0, 245, 255, 0.15)",
    glowPlatform: 8,
    glowVehicle: 10,
    glowActor: 12,
  },
  retro: {
    bg: "#1a1206",
    laneGoal: "rgba(192, 64, 0, 0.10)",
    laneRiver: "rgba(192, 64, 0, 0.22)",
    laneSafe: "rgba(255, 176, 0, 0.14)",
    laneRoad: "rgba(255, 176, 0, 0.05)",
    roadMarking: "rgba(255, 176, 0, 0.30)",
    log: "#c04000",
    turtle: "#ff7b00",
    turtleSubmerged: "rgba(255, 123, 0, 0.25)",
    vehicles: ["#ff7b00", "#ffb000", "#c04000", "#ffb000", "#ff7b00"],
    lilypad: "#ffb000",
    frog: "#ffb000",
    frogEye: "#1a1206",
    hudStrip: "#1a1206",
    hudTrack: "rgba(255, 176, 0, 0.10)",
    hudText: "#ffb000",
    timerHigh: "#ffb000",
    timerMid: "#ff7b00",
    timerLow: "#c04000",
    padChipEmpty: "rgba(255, 176, 0, 0.15)",
    glowPlatform: 0,
    glowVehicle: 0,
    glowActor: 0,
  },
};
