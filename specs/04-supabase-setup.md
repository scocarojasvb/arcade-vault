# SPEC 04 — Integración base de Supabase

> **Estado:** Approved
> **Depende de:** ninguna spec previa (independiente)
> **Fecha:** 2026-07-28
> **Objetivo:** Integrar el SDK de Supabase (`@supabase/supabase-js` + `@supabase/ssr`) en la aplicación Next.js — clientes de browser y de servidor, y `proxy.ts` para refresco de sesión — como base de plomería para futuras specs de auth, base de datos, realtime y edge functions, sin implementar todavía ninguna lógica de negocio.

## Scope

**In:**

- Instalar las dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Crear `app/lib/supabase/client.ts`: cliente de Supabase para uso en Client Components (browser), usando `createBrowserClient` de `@supabase/ssr`.
- Crear `app/lib/supabase/server.ts`: cliente de Supabase para uso en Server Components / Route Handlers, usando `createServerClient` de `@supabase/ssr` con manejo de cookies vía `next/headers`.
- Crear `proxy.ts` en la raíz del proyecto (convención de Next.js 16, reemplaza al antiguo `middleware.ts`): refresca la sesión de Supabase en cada request usando el patrón oficial de `@supabase/ssr`.
- Documentar en `.env.template` las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sin valores reales, mismo patrón que `RESEND_API_KEY`).

**Out of scope (para futuros specs):**

- Cualquier lógica de autenticación real (login, signup, logout, providers OAuth) — la spec de auth futura consumirá los clientes creados aquí, no los crea de nuevo.
- Cualquier esquema de base de datos, tabla o migración (usuarios, scores, players) — esta spec no toca Postgres, solo el SDK cliente.
- Realtime (suscripciones a canales) y Edge Functions — mencionados como uso futuro en el objetivo, pero sin ningún código en esta spec.
- Row Level Security (RLS) — no aplica todavía porque no hay tablas.
- Endpoint o ruta de prueba/healthcheck — la verificación de esta spec es solo `npm run build` + revisión manual de los archivos creados.
- Reemplazar `AuthContext`/`localStorage` existentes — siguen intactos hasta que exista la spec de auth real.

## Data model

Esta spec no introduce estructuras de datos nuevas: no se crea ninguna tabla, migración ni esquema en Postgres — solo se configuran los clientes SDK (browser/servidor) y el archivo de refresco de sesión. Se omite esta sección por no aplicar.

## Implementation plan

1. Instalar las dependencias: `npm install @supabase/supabase-js @supabase/ssr`.
2. Agregar a `.env.template` las variables `NEXT_PUBLIC_SUPABASE_URL=""` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""`, con un comentario indicando que se obtienen desde el dashboard de Supabase (Project Settings → API), siguiendo el mismo formato que `RESEND_API_KEY`.
3. Crear `app/lib/supabase/client.ts`: exporta una función `createClient()` que usa `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Crear `app/lib/supabase/server.ts`: exporta una función async `createClient()` que usa `createServerClient` de `@supabase/ssr`, integrando `cookies()` de `next/headers` para leer/escribir la sesión en Server Components y Route Handlers.
5. Crear `proxy.ts` en la raíz del proyecto: implementa el refresco de sesión de Supabase en cada request (patrón oficial `updateSession`), usando `createServerClient` con el `NextRequest`/`NextResponse` de Next.js 16. Configurar el `matcher` para excluir assets estáticos (`_next/static`, `_next/image`, favicon, etc.).
6. Revisión final: `npm run build` sin errores de tipos ni compilación, y verificación manual de que los tres archivos nuevos (`app/lib/supabase/client.ts`, `app/lib/supabase/server.ts`, `proxy.ts`) no rompen ninguna ruta existente (la app sigue funcionando igual, ya que nada llama todavía a estos clientes).

## Acceptance criteria

- [ ] `@supabase/supabase-js` y `@supabase/ssr` aparecen como dependencias en `package.json`.
- [ ] `.env.template` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` documentadas, sin valores reales.
- [ ] `app/lib/supabase/client.ts` existe y exporta un `createClient()` funcional para uso en Client Components, sin errores de tipos.
- [ ] `app/lib/supabase/server.ts` existe y exporta un `createClient()` async funcional para Server Components/Route Handlers, integrando `cookies()` de `next/headers`, sin errores de tipos.
- [ ] `proxy.ts` existe en la raíz del proyecto y refresca la sesión de Supabase en cada request, con un `matcher` que excluye assets estáticos.
- [ ] `npm run dev` levanta el proyecto sin errores en consola.
- [ ] `npm run build` completa sin errores de tipos ni de compilación.
- [ ] Ninguna ruta o funcionalidad existente (auth fake, biblioteca, scores, contacto) se rompe — la app se comporta igual que antes de esta spec, ya que nada consume todavía los clientes de Supabase.

## Decisions

- **Sí:** integrar tanto `@supabase/supabase-js` como `@supabase/ssr`, en vez de solo uno. El usuario planea usar auth, base de datos, realtime y edge functions a futuro; `@supabase/ssr` cubre el manejo de sesión/cookies en App Router, y `@supabase/supabase-js` es la base sobre la que se construye.
- **Sí:** crear `proxy.ts` (refresco de sesión) en esta spec, aunque la lógica de auth real sea de otra spec futura. Sin este archivo, cuando exista auth real las cookies de sesión no se refrescarían correctamente; es parte de la plomería de integración, no de la lógica de negocio.
- **Sí:** los clientes viven en `app/lib/supabase/` (no en un `lib/` en la raíz), consistente con que todo el código de este proyecto vive bajo `app/` (`app/data`, `app/hooks`, `app/components`).
- **Sí:** usar `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato moderno `sb_publishable_...`) en vez de la anon key legacy (JWT), siguiendo la recomendación actual de Supabase para proyectos nuevos.
- **No:** implementar ninguna lógica de auth, esquema de base de datos, RLS, realtime o edge functions en esta spec — son specs futuras independientes que consumirán los clientes creados aquí.
- **No:** crear un endpoint o ruta de healthcheck para probar la conexión. La verificación de esta spec es `npm run build` + revisión manual; probar la conexión real queda implícito en la primera spec que use estos clientes (auth o base de datos).
- **No:** tocar `AuthContext` ni el `localStorage` existente — siguen intactos hasta la spec de auth real.

## Risks

| Riesgo                                                                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proxy.ts` con un `matcher` mal configurado podría interceptar rutas que no debería (assets estáticos, API routes de Resend) y romper la app aunque no haya auth real todavía.                                                | Paso 6 del plan de implementación: revisión manual explícita de que ninguna ruta existente se rompe antes de cerrar la spec.                                                                                                                                     |
| Las variables `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ausentes en `.env` (solo están en `.env.template` sin valor) harían fallar `createClient()` en tiempo de ejecución si algo llega a invocarlo. | No es un riesgo real en esta spec porque ningún código llama todavía a los clientes creados; queda documentado para cuando la spec de auth los consuma.                                                                                                          |
| `@supabase/ssr` es una librería relativamente nueva pensada para el App Router "clásico" — podría tener incompatibilidades no documentadas con Next.js 16.2 (Turbopack por defecto, `proxy.ts` en vez de `middleware.ts`).    | Se sigue el patrón oficial de `@supabase/ssr` pero adaptado a la convención de `proxy.ts` de Next.js 16 (ver `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`); el criterio de aceptación de build cubre errores de compatibilidad evidentes. |
| `.env` con las keys reales de Supabase podría commitearse por error si no está en `.gitignore`.                                                                                                                               | Verificar antes de implementar que `.env` esté en `.gitignore` (ya es la convención del proyecto con `RESEND_API_KEY`).                                                                                                                                          |

## What is **not** in this spec

- Lógica de autenticación real (login, signup, OAuth).
- Esquema de base de datos, tablas, migraciones, RLS.
- Realtime y Edge Functions.
- Endpoint de healthcheck.
- Cambios a `AuthContext` o `localStorage`.

Cada uno de estos, si se implementa, va en su propio spec.
