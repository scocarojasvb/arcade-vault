# SPEC 03 — About y envío de correo con Resend

> **Estado:** Approved
> **Depende de:** [02-home-landing](02-home-landing.md)
> **Fecha:** 2026-07-24
> **Objetivo:** Migrar la pantalla About/Contacto (`about.jsx`) a la ruta `/acerca-de` de Next.js App Router, agregar el link "Sobre nosotros" al Nav, y conectar el formulario de contacto a un endpoint real que envía el mensaje por correo usando Resend.

## Scope

**In:**

- Nueva ruta `/acerca-de` (`app/acerca-de/page.tsx`): migra el JSX completo de `about.jsx` — hero "ACERCA DE ARCADE VAULT" con `highlight-row` (3 highlights: HEART, BROWSER, PLANT), divider decorativo (`about-divider`, `div-pixels`), y sección de contacto (`contact-intro` + `contact-form`).
- Animación al hacer scroll (`.reveal`/`.in`) reutilizando el hook `useReveal` ya existente en `app/hooks/use-reveal.ts` (creado en la spec 02) — no se crea uno nuevo.
- Componente `HighlightIcon` (SVGs HEART/BROWSER/PLANT de `about.jsx`), migrado a `app/components/highlight-icon.tsx`.
- Estilos: portar a `app/globals.css` las clases `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight` (+ `.cyan`/`.magenta`/`.green`), `.about-divider`, `.div-bar`, `.div-pixels`, `.about-contact`, `.contact-grid`, `.contact-intro`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.contact-form` (+ `.shake`), `.terminal-success` y clases relacionadas, desde `references/templates/home-about/styles.css`.
- Actualizar `app/components/nav.tsx`: agregar link **"Sobre nosotros"** → `/acerca-de` en el menú de escritorio y en el panel móvil, y ajustar `isActive` para reconocer esta ruta.
- Endpoint real de envío de correo: **Route Handler** `app/api/contacto/route.ts` (`POST`), que recibe `{ name, email, msg }`, valida los campos en servidor, y usa el SDK `resend` para enviar el mensaje a `santiago.coca@vibeconsulting.com.co` desde `onboarding@resend.dev`.
- Conectar el `contact-form` del cliente a este endpoint (`fetch("/api/contacto")`), reemplazando el `setSent` simulado del template por una llamada real, con tres estados: formulario, éxito (reutiliza el `terminal-success` del template) y error (mensaje inline, ver sección de decisiones).
- Instalar la dependencia `resend` (`npm install resend`) y documentar `RESEND_API_KEY` en `.env.template`.

**Out of scope (para futuros specs):**

- Dominio propio verificado en Resend (por ahora se usa `onboarding@resend.dev`, que solo permite enviar a `santiago.coca@vibeconsulting.com.co`).
- Protección anti-spam (honeypot, captcha, rate limiting).
- Persistencia de los mensajes de contacto en base de datos — el envío es "fire and forget" vía correo, no se guarda historial.
- Página de política de privacidad o términos (no existen en el template ni se pidieron).
- Cualquier cambio a otras pantallas más allá de agregar el link "Sobre nosotros" al Nav.

## Data model

Esta spec no introduce estructuras de datos persistentes. Sí define el contrato del endpoint de contacto:

**Request** — `POST /api/contacto`

```ts
type ContactRequest = {
  name: string;
  email: string;
  msg: string;
};
```

**Response — éxito** (`200`):

```ts
type ContactSuccess = {
  ok: true;
};
```

**Response — error** (`400` para validación, `502` para fallo de Resend):

```ts
type ContactError = {
  ok: false;
  error: string; // mensaje legible, ej. "Completa todos los campos." | "No se pudo enviar el mensaje, intenta de nuevo."
};
```

La validación de campos vacíos ya existe en el cliente (`shake` en `about.jsx`); el Route Handler repite una validación mínima en servidor (campos no vacíos, `email` con formato básico `algo@algo.algo`) antes de llamar a Resend, ya que el cliente no es una fuente confiable.

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y agregar `RESEND_API_KEY=` a `.env.template` (sin valor real) con un comentario indicando que se obtiene desde el dashboard de Resend.
2. Portar a `app/globals.css` las clases de estilos de About/Contacto listadas en el Scope, desde `references/templates/home-about/styles.css`.
3. Crear `app/components/highlight-icon.tsx`: migra `HighlightIcon` (SVGs HEART/BROWSER/PLANT) tal cual de `about.jsx`.
4. Crear `app/api/contacto/route.ts`: Route Handler `POST` que valida `{ name, email, msg }` en servidor (no vacíos, formato de email básico), y si es válido usa el SDK `resend` para enviar un correo desde `onboarding@resend.dev` a `santiago.coca@vibeconsulting.com.co` con asunto `Nuevo mensaje de contacto — Arcade Vault` y el nombre/email/mensaje en el cuerpo. Devuelve `{ ok: true }` o `{ ok: false, error }` según corresponda.
5. Crear `app/acerca-de/page.tsx`: migra el JSX completo de `about.jsx` (hero, highlight-row con `HighlightIcon`, divider, contact-intro, contact-form), usando `useReveal` existente para las clases `.reveal`.
6. Conectar `contact-form` de `app/acerca-de/page.tsx` al endpoint: al enviar, hace `fetch("/api/contacto", { method: "POST", body: JSON.stringify(form) })`; mientras espera respuesta deshabilita el botón de envío; en éxito (`ok: true`) muestra el `terminal-success` igual que el template; en error (`ok: false` o fallo de red) muestra un mensaje inline de error debajo del formulario sin perder lo escrito, y permite reintentar.
7. Actualizar `app/components/nav.tsx`: agregar link **"Sobre nosotros"** → `/acerca-de` en el menú de escritorio y el panel móvil, y ajustar `isActive` para reconocer `/acerca-de` como ruta activa propia (sin afectar la detección de "Inicio", "Biblioteca" o "Salón de la Fama").
8. Revisión final: `npm run build` sin errores, y prueba manual del formulario con una `RESEND_API_KEY` real (envío exitoso) y con una key inválida/ausente (para confirmar que el estado de error se muestra correctamente).

## Acceptance criteria

- [ ] `npm run dev` levanta el proyecto sin errores en consola.
- [ ] `/acerca-de` muestra el hero "ACERCA DE ARCADE VAULT", los 3 highlights (HEART, BROWSER, PLANT) con sus colores (magenta, cyan, green), el divider animado y la sección de contacto.
- [ ] Las secciones con clase `.reveal` en `/acerca-de` aparecen con fade/slide al hacer scroll hasta ellas (no visibles ya cargadas si empiezan fuera del viewport).
- [ ] El Nav (menú de escritorio y panel móvil) muestra el link **"Sobre nosotros"** apuntando a `/acerca-de`, y se resalta como activo únicamente en esa ruta, sin romper el resaltado de "Inicio", "Biblioteca" o "Salón de la Fama".
- [ ] Enviar el formulario con algún campo vacío dispara el efecto `shake` y no llama al endpoint (igual que el template).
- [ ] Enviar el formulario completo con una `RESEND_API_KEY` válida en `.env` hace que llegue un correo real a `santiago.coca@vibeconsulting.com.co` con nombre, email y mensaje del formulario, y el cliente muestra el `terminal-success` con el nombre del remitente.
- [ ] Enviar el formulario completo con una `RESEND_API_KEY` inválida o ausente muestra un mensaje de error inline (no rompe la página, no pierde lo escrito en el formulario) y permite reintentar.
- [ ] El botón de envío se deshabilita mientras espera la respuesta del endpoint (evita doble envío).
- [ ] `POST /api/contacto` rechaza con `400` si falta algún campo o el email no tiene formato válido, sin llamar a Resend.
- [ ] `.env.template` incluye `RESEND_API_KEY` documentada (sin valor real).
- [ ] El build de producción (`npm run build`) completa sin errores de tipos ni de compilación.

## Decisions

- **Sí:** ruta `/acerca-de` (español), consistente con `/salon-de-la-fama` y el resto de rutas del proyecto, en vez de `/about`.
- **Sí:** el link en el Nav se llama **"Sobre nosotros"** (no "Acerca de"), por pedido explícito del usuario.
- **Sí:** se agrega el link al Nav en esta misma spec, ya que la página existirá y no genera un 404 (a diferencia del criterio usado en la spec 02, donde la página aún no existía).
- **Sí:** envío de correo vía **Route Handler** (`app/api/contacto/route.ts`) en vez de Server Action. Un Route Handler da un contrato HTTP explícito (`fetch` + JSON) más simple de probar y de mantener separado del componente cliente que ya usa `fetch` en el patrón de este proyecto (no hay Server Actions usadas hasta ahora).
- **Sí:** remitente `onboarding@resend.dev`, destino fijo `santiago.coca@vibeconsulting.com.co`, porque no hay dominio verificado en Resend todavía. El destino queda hardcodeado en el servidor (no lo controla el usuario del formulario) — es una decisión explícita del usuario del proyecto, no de quien llena el formulario.
- **Sí:** en caso de error de envío se muestra un **mensaje de error inline** simple (no se reutiliza el estilo `terminal-success` para el caso de error), porque es más simple de implementar y de entender para quien llena el formulario, y así lo indicó el usuario.
- **No:** protección anti-spam (honeypot, captcha) en esta spec — no hay usuarios reales todavía (MVP). Se evalúa en una spec futura si el formulario queda expuesto públicamente y empieza a recibir spam.
- **No:** persistir los mensajes de contacto en base de datos. El envío es "fire and forget" por correo; no hay backend de datos de usuarios en este proyecto todavía más allá de los archivos estáticos en `app/data/`.
- **No:** dominio propio verificado en Resend en esta spec — requiere configuración DNS fuera del alcance de este spec; se deja para cuando el usuario tenga un dominio disponible.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Sin dominio verificado, `onboarding@resend.dev` solo puede enviar a la cuenta con la que se registró la API key en Resend (`santiago.coca@vibeconsulting.com.co`) — si el destino se cambia sin verificar dominio, Resend rechaza el envío. | Documentado explícitamente en la sección de Decisiones y en `.env.template`; el criterio de aceptación prueba el envío real antes de cerrar la spec. |
| `RESEND_API_KEY` ausente o inválida en producción rompería el envío silenciosamente si no se maneja el error. | El Route Handler devuelve `502` con `{ ok: false, error }` explícito, y el cliente muestra el estado de error inline — cubierto en el criterio de aceptación correspondiente. |
| El formulario queda públicamente expuesto sin protección anti-spam; podría recibir envíos automatizados. | Aceptado como riesgo conocido (ver Decisiones) — se pospone a una spec futura si se vuelve un problema real. |
| `.env` con `RESEND_API_KEY` real podría commitearse por error si no está en `.gitignore`. | Verificar antes de implementar que `.env` esté en `.gitignore` (ya existe `.env.template` como plantilla sin secretos, lo que sugiere que ya es la convención del proyecto). |

## What is **not** in this spec

- Dominio verificado en Resend.
- Protección anti-spam.
- Persistencia de mensajes de contacto.
- Página de política de privacidad o términos.

Cada uno de estos, si se implementa, va en su propio spec.
