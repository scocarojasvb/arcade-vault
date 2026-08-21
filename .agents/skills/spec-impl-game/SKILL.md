---
name: spec-impl-game
description: Implementa un spec aprobado de juego siguiendo /spec-impl al pie de la letra y, al terminar, encadena automáticamente los subagentes skin-designer y luego mobile-porter (nunca en paralelo) con el alcance derivado del spec implementado.
disable-model-invocation: true
argument-hint: <NN-nombre-del-spec>
---

# /spec-impl-game — Implementador de specs de juego + skins + móvil

Esta skill es una variante de `/spec-impl` especializada en specs que agregan un juego real al
catálogo. Reusa `/spec-impl` tal cual está — no reescribe sus fases — y al terminar la
implementación encadena automáticamente `skin-designer` y luego `mobile-porter`, en ese orden,
nunca en paralelo.

## Contexto de sesión

Estado actual del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles en esta carpeta:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ no existe"`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (default, sin archivo de configuración)"`

Estado de skins por juego:
!`cat references/games-with-theme.md 2>/dev/null || echo "references/games-with-theme.md no existe todavía"`

Estado de rutas móviles:
!`cat references/mobile-ready-pages.md 2>/dev/null || echo "references/mobile-ready-pages.md no existe todavía"`

---

## Instrucciones

Seguí estas fases en orden estricto. No avancés a la fase siguiente si la anterior no se completó
correctamente.

### Fases 1–4 — delegadas a /spec-impl

El argumento recibido es: `$ARGUMENTS`

Leé el archivo `.agents/skills/spec-impl/SKILL.md` completo con la herramienta Read y ejecutá sus
Fases 1, 2, 3 y 4 **exactamente como están escritas ahí**, pasando `$ARGUMENTS` como si fuera el
argumento nativo de `/spec-impl`. No reescribas ni resumas esas fases desde memoria — leé el
archivo cada vez, porque es un skill instalado (`Klerith/fernando-skills`, trackeado en
`skills-lock.json`) que puede actualizarse con `npx skills@latest add` y este comando debe heredar
esos cambios sin quedar desincronizado.

Se heredan sin renegociar, entre otras:

- El bloqueo de la Fase 2: si el estado del spec no significa "Aprobado" (en cualquier idioma), se
  detiene ahí, muestra el mensaje de error estándar de `spec-impl`, y **este comando nunca llega a
  la Fase 5** — no se lanza ningún subagente.
- La creación de rama `spec-NN-slug` de la Fase 3, según `AutoCreateBranch`.
- El ritmo de pausas por paso con revisión de diff de la Fase 4.

Si en cualquier punto de las Fases 1–4 el flujo se detiene (spec no encontrado, estado no
aprobado, ambigüedad sin resolver, el usuario no confirma un paso), este comando también se
detiene ahí. No sigas a las fases siguientes.

### Fase 4.5 — verificar criterios de aceptación

Cuando el último paso del plan de implementación esté hecho:

1. Recorré la checklist de criterios de aceptación del spec uno por uno y confirmá cada uno.
2. Corré `npm run build`.
3. Si algún criterio falla o el build no pasa: reportalo y **parate ahí**. No sigas a la Fase 5 —
   los subagentes verifican con `npm run build` y arrancarían sobre una base rota.

### Fase 5 — derivar el alcance (sin preguntar al usuario)

**Game id para `skin-designer`:**

- Tomalo del spec recién implementado: la ruta `app/games/<id>/<id>-game.tsx` de su plan de
  implementación, o el `id` de la fila que agregó/actualizó en la tabla `games`.
- Verificalo contra `REAL_GAME_IDS` en `app/data/real-games.ts`. Si el `id` no quedó registrado
  ahí, la implementación quedó incompleta respecto del spec — parate y reportalo, no sigas a la
  Fase 6.

**Rutas para `mobile-porter`:**

- Por defecto: `/juego/[id]/jugar`, `/juego/[id]` y `/biblioteca` — las tres rutas que cambian
  siempre que entra un juego nuevo al catálogo.
- Ampliá esta lista solo si el spec tocó explícitamente otra ruta (por ejemplo
  `/salon-de-la-fama` si agregó algo al leaderboard).

**Caso borde — el spec no agrega un juego:**

Si no podés derivar ningún `id` de juego del spec implementado, no lo inventes. Parate, explicale
esto al usuario, y preguntale con AskUserQuestion si de todos modos quiere correr `mobile-porter`
sobre las rutas que el spec sí tocó, o no correr ningún subagente. Este es el único punto de esta
skill donde se pregunta algo — es una salida de error, no el camino feliz.

### Fase 6 — encadenar los subagentes, estrictamente en serie

1. Lanzá `skin-designer` (Agent tool) nombrando explícitamente el `id` del juego derivado en la
   Fase 5 — el prompt tiene que nombrarlo para que su filtro de memoria
   (`references/games-with-theme.md`) no lo trate como ya completo por error. Esperá a que
   termine y leé su resumen final.
2. **Recién cuando `skin-designer` terminó**, lanzá `mobile-porter` nombrando explícitamente la
   lista de rutas derivada en la Fase 5. Esperá a que termine.
3. Regla dura: **nunca lances los dos agentes en el mismo mensaje ni en paralelo.** Ambos pueden
   tocar `app/juego/[id]/jugar/page.tsx` y `app/globals.css`; correrlos a la vez los pisaría entre
   sí.
4. Si `skin-designer` reporta una falla o deja `npm run build` roto, no lances `mobile-porter`:
   reportá la falla al usuario y parate ahí.

### Fase 7 — cierre

Mostrá un resumen final con:

- Criterios de aceptación verificados (Fase 4.5).
- Skins implementadas por `skin-designer` y su fila resultante en
  `references/games-with-theme.md`.
- Rutas móviles arregladas por `mobile-porter` y su fila resultante en
  `references/mobile-ready-pages.md`.
- El recordatorio heredado de `spec-impl`: pasar el estado del spec a "Implementado" (o el
  equivalente en el idioma del repo) y hacer el commit final antes de mergear la rama.

Esta skill **no** hace commits ni mergea ramas por su cuenta — eso queda para el usuario, igual
que en `/spec-impl`.

---

## Reglas duras

- Nunca reescribas ni copies las Fases 1–4 de `/spec-impl` dentro de esta skill — siempre leelas
  del archivo `.agents/skills/spec-impl/SKILL.md` en el momento de ejecutar.
- Nunca cambies el orden de los subagentes: siempre `skin-designer` primero, `mobile-porter`
  después, nunca invertido ni simultáneo.
- Nunca toques `skills-lock.json` desde esta skill.
- Nunca edites `.claude/agents/skin-designer.md` ni `.claude/agents/mobile-porter.md`.
- Respondé siempre en el idioma en que te escribió el usuario.
