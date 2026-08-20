/**
 * Utilidades compartidas de skins para los juegos que dibujan spritesheets
 * (snake: hoja de frutas; arkanoid: hoja completa).
 *
 * No importa nada de `registry.tsx` a propósito: eso crearía el ciclo
 * registry → <id>-game → registry.
 *
 * El tintado se "hornea" una sola vez en un canvas offscreen al cargar la hoja o
 * al cambiar de skin — nunca por frame.
 */

export interface SheetTint {
  /** Valor de `ctx.filter` aplicado al volcar la hoja. Ej: "hue-rotate(200deg) saturate(1.5)". */
  filter: string;
  /** Tono opcional multiplicado sobre la hoja ya filtrada (rampa monocroma retro). */
  multiply?: string;
}

/**
 * Devuelve un canvas offscreen del mismo tamaño que `img` con el tinte aplicado.
 * Con `tint = null` es una copia fiel de la hoja original (skin `classic`).
 */
export function bakeTintedSheet(img: HTMLImageElement, tint: SheetTint | null): HTMLCanvasElement {
  const oc = document.createElement("canvas");
  oc.width = img.width;
  oc.height = img.height;
  const octx = oc.getContext("2d");
  if (!octx) return oc;

  octx.filter = tint?.filter ?? "none";
  octx.drawImage(img, 0, 0);

  if (tint?.multiply) {
    octx.filter = "none";
    octx.globalCompositeOperation = "multiply";
    octx.fillStyle = tint.multiply;
    octx.fillRect(0, 0, oc.width, oc.height);
    // "multiply" contra destino transparente inunda el fondo de color opaco:
    // recortar de vuelta al alpha original de la hoja.
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = "source-over";
  }

  octx.filter = "none";
  return oc;
}
