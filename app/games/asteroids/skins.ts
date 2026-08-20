import type { SkinId } from "../skins";

/**
 * Paleta de Asteroids. Juego 100% vectorial: cada campo es un rol de dibujo
 * exactamente donde antes había un literal de color.
 *
 * - `classic` reproduce valor por valor los colores originales del juego
 *   (línea base de regresión: no debe cambiar ni un píxel).
 * - `neon` usa solo los tokens de acento de globals.css (--cyan #00f5ff,
 *   --magenta #ff006e, --yellow #f5ff00, --green #00ff88) más --bg/--ink,
 *   con el amarillo como acento principal (color de catálogo de asteroids).
 * - `retro` es fósforo CRT ámbar monocromo de 4 tonos, sin glow.
 */
export interface AsteroidsSkin {
  /** Fondo del canvas. */
  bg: string;
  /** Casco de la nave y su icono de vida en el HUD. */
  ship: string;
  /** Llama del propulsor. */
  thrust: string;
  /** Contorno de los asteroides. */
  asteroid: string;
  /** Balas. */
  bullet: string;
  /** Marco y etiqueta "3x" del power-up. */
  powerUp: string;
  /** Componentes RGB de las partículas de explosión ("r,g,b"); el alpha lo pone el frame. */
  particleRgb: string;
  /** Texto principal del HUD dibujado en el canvas (score / nivel). */
  hudText: string;
  /** Texto de acento del HUD (temporizador del triple disparo). */
  hudAccent: string;
  /** ctx.shadowBlur del trazo vectorial: 0 = sin glow. */
  glow: number;
}

export const ASTEROIDS_SKINS: Record<SkinId, AsteroidsSkin> = {
  classic: {
    bg: "#000",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    asteroid: "#fff",
    bullet: "#fff",
    powerUp: "#0ff",
    particleRgb: "255,255,255",
    hudText: "#fff",
    hudAccent: "#0ff",
    glow: 0,
  },
  neon: {
    bg: "#0a0a0f",
    ship: "#f5ff00",
    thrust: "#ff006e",
    asteroid: "#00f5ff",
    bullet: "#00ff88",
    powerUp: "#ff006e",
    particleRgb: "245,255,0",
    hudText: "#e6e9ff",
    hudAccent: "#ff006e",
    glow: 9,
  },
  retro: {
    bg: "#1a1206",
    ship: "#ffb000",
    thrust: "#ff7b00",
    asteroid: "#c04000",
    bullet: "#ffb000",
    powerUp: "#ff7b00",
    particleRgb: "255,123,0",
    hudText: "#ffb000",
    hudAccent: "#ff7b00",
    glow: 0,
  },
};
