import type { SkinId } from "../skins";
import type { SheetTint } from "../skin-utils";

/**
 * Paleta de Arkanoid. El juego dibuja casi todo desde un spritesheet
 * (`/games/arkanoid/spritesheet-breakout.png`), así que la skin tiene dos partes:
 * los pocos colores dibujados a mano (fondo del canvas y texto del HUD interno) y
 * el `tint` que se hornea sobre la hoja con `bakeTintedSheet`.
 *
 * - `classic` reproduce valor por valor el juego original (`bg #000`, HUD `#fff`,
 *   hoja sin tintar): línea base de regresión, no debe cambiar ni un píxel.
 * - `neon` usa solo tokens de acento de globals.css (--bg #0a0a0f / --ink #e6e9ff),
 *   con el magenta (--magenta #ff006e) como acento de catálogo de arkanoid, y
 *   desplaza la hoja con `hue-rotate`.
 * - `retro` es fósforo CRT ámbar monocromo, sin glow: la hoja pasa a grises y se
 *   multiplica por el ámbar más brillante de la rampa, lo que reparte los tonos
 *   originales de cada bloque sobre la misma rampa de 4 pasos.
 */
export interface ArkanoidSkin {
  /** Fondo del canvas. */
  bg: string;
  /** Texto del HUD dibujado dentro del canvas (score / nivel). */
  hudText: string;
  /** ctx.shadowBlur del texto del HUD: 0 = sin glow. */
  glow: number;
  /** Tintado horneado del spritesheet; `null` = hoja intacta. */
  tint: SheetTint | null;
}

export const ARKANOID_SKINS: Record<SkinId, ArkanoidSkin> = {
  classic: {
    bg: "#000",
    hudText: "#fff",
    glow: 0,
    tint: null,
  },
  neon: {
    bg: "#0a0a0f",
    hudText: "#e6e9ff",
    glow: 10,
    // Desviación aceptada: hue-rotate mueve TODOS los colores de bloque juntos,
    // así que no caen exactamente sobre los 4 tokens de acento. Se prefiere esto
    // porque conserva el sombreado interno de cada sprite (un tinte plano por
    // color con source-atop sería más fiel a los tokens pero aplanaría el relieve).
    tint: { filter: "hue-rotate(295deg) saturate(1.5) brightness(1.1)" },
  },
  retro: {
    bg: "#1a1206",
    hudText: "#ffb000",
    glow: 0,
    tint: { filter: "grayscale(1) brightness(1.1)", multiply: "#ffb000" },
  },
};
