import type { SkinId } from "../skins";
import type { SheetTint } from "../skin-utils";

/**
 * Paleta de Snake. Cada campo es un rol de dibujo exactamente donde antes
 * había un literal de color en `snake-game.tsx`.
 *
 * - `classic` reproduce valor por valor los colores originales del juego
 *   (línea base de regresión: no debe cambiar ni un píxel).
 * - `neon` usa solo los tokens de acento de globals.css (--cyan #00f5ff,
 *   --magenta #ff006e, --yellow #f5ff00, --green #00ff88) más --bg/--ink,
 *   con el verde como acento principal (color de catálogo de snake).
 * - `retro` es fósforo CRT verde monocromo de 4 tonos, sin glow.
 */
export interface SnakeSkin {
  /** Fondo del canvas. */
  bg: string;
  /** Cabeza de la serpiente. */
  head: string;
  /** Segmentos del cuerpo. */
  body: string;
  /** ctx.shadowColor del cuerpo/cabeza. */
  glowColor: string;
  /** ctx.shadowBlur de la cabeza: 0 = sin glow. */
  glowHead: number;
  /** ctx.shadowBlur de los segmentos del cuerpo: 0 = sin glow. */
  glowBody: number;
  /** Texto del HUD dibujado dentro del canvas (score / nivel). */
  hudText: string;
  /**
   * Tintado horneado de la hoja de frutas (`/games/snake/fruits.png`).
   * `null` = hoja original sin tocar.
   */
  fruitTint: SheetTint | null;
}

export const SNAKE_SKINS: Record<SkinId, SnakeSkin> = {
  classic: {
    bg: "#0a0a18",
    head: "#7dffb0",
    body: "#00ff88",
    glowColor: "#00ff88",
    glowHead: 10,
    glowBody: 6,
    hudText: "#fff",
    fruitTint: null,
  },
  neon: {
    bg: "#0a0a0f",
    head: "#f5ff00",
    body: "#00ff88",
    glowColor: "#00ff88",
    glowHead: 12,
    glowBody: 8,
    hudText: "#e6e9ff",
    // Desviación aceptada: hue-rotate mueve todos los tonos de la hoja de frutas
    // en bloque, así que las frutas no caen exactamente sobre los 4 tokens de
    // acento. Se prefiere esto porque conserva el sombreado interno del sprite.
    fruitTint: { filter: "hue-rotate(200deg) saturate(1.6) brightness(1.1)" },
  },
  retro: {
    bg: "#0f380f",
    head: "#9bbc0f",
    body: "#8bac0f",
    glowColor: "#306230",
    glowHead: 0,
    glowBody: 0,
    hudText: "#9bbc0f",
    fruitTint: { filter: "grayscale(1) brightness(1.1)", multiply: "#8bac0f" },
  },
};
