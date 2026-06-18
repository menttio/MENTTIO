# Nivel B · Fase 5 — Hosting (Cloudflare Pages) + PWA

## Objetivo
Servir el frontend React (incl. la versión móvil) desde **Cloudflare Pages** en vez de Base44,
y dejarlo como **PWA instalable** ("app móvil").

## Crear el proyecto en Cloudflare Pages
1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → repo
   `menttio/MENTTIO`, rama **`nivel-b`** (en el corte se cambia a `main`).
2. **Build settings**:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
3. **Environment variables** (Production y Preview) — ver `.env.nivel-b.example`:
   ```
   VITE_USE_SUPABASE=true
   VITE_SUPABASE_URL=https://hvwwmjpjzmxzlncfxnph.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_SIH6V31I3wSyrkY47w17GA_SDCzkMGp
   VITE_FUNCTIONS_URL=https://menttio-functions.raul2000plgr.workers.dev
   VITE_AUTOMATIONS_URL=https://menttio-automations.raul2000plgr.workers.dev
   ```
4. Deploy → Cloudflare da una URL `*.pages.dev` para probar antes de tocar el dominio.

## SPA routing
La app usa React Router. Para que las rutas profundas no den 404 en Pages, añadir un
`public/_redirects` con:
```
/*    /index.html   200
```

## CORS
El Worker de funciones (`menttio-functions`) tiene `ALLOWED_ORIGIN="*"` ahora. En producción,
ponerlo al dominio definitivo (la URL de Pages / `menttio.com`) y redeploy del Worker.

## PWA (app móvil instalable)
La versión móvil es la misma web responsive. Para hacerla instalable:
- Añadir `public/manifest.webmanifest` (creado) + `<link rel="manifest">` en el HTML.
- Opcional/recomendado: `vite-plugin-pwa` para el service worker (offline + "Add to Home Screen").
- Iconos 192x192 y 512x512 en `public/` (usar el logo de Menttio).

## Dominio (en el corte, Fase 6)
- En Pages → **Custom domains** → añadir `menttio.com` (cambiar el DNS para que apunte a Pages).
- Hacer esto SOLO en el corte, cuando todo esté validado, para no cortar la app viva.

## Checklist de corte (Fase 6)
1. Migrar datos Base44 → Supabase (runbook doc 03).
2. Pages apuntando a `main` (tras fusionar `nivel-b`), env vars puestas.
3. `ALLOWED_ORIGIN` del Worker de funciones al dominio final.
4. Apuntar `menttio.com` a Pages.
5. Observar; luego baja de Base44 + rotación de claves.
