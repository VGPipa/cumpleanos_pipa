# Cumple de Pipa

Juego público de 10 preguntas, ranking por puntaje y tiempo, y confirmación de asistencia. El diseño aprobado vive en `public/` y se conserva sin cambios visuales.

## Arquitectura

- Vercel sirve el frontend estático de `public/` y las funciones de `api/`.
- Las funciones usan `@supabase/supabase-js` con una clave secreta disponible solo en el servidor.
- Supabase guarda el contenido del quiz, partidas, respuestas, ranking y RSVP.
- El navegador recibe un token opaco por partida. En Supabase solo se almacena su hash SHA-256.
- Las respuestas correctas se validan en PostgreSQL y no están incluidas en `public/app.js`.

Las imágenes optimizadas están en `public/imagenes/`; las originales permanecen en `Fotos/`. La invitación está en `public/invitacion-cumpleanos-pipa.png`.

## Variables de entorno

Configurar en Vercel para Production, Preview y Development:

```text
SUPABASE_URL=https://varjrciphuvpjspyouot.supabase.co
SUPABASE_SECRET_KEY=<clave secreta del proyecto>
PIPA_QUIZ_SLUG=pipa-27-2026
```

No exponer `SUPABASE_SECRET_KEY` con un prefijo público ni guardarla en Git.

## Desarrollo y verificación

Requiere Node.js 22 y pnpm mediante Corepack.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
```

Para probar las Vercel Functions localmente, crear `.env.local` a partir de `.env.example` y usar Vercel CLI:

```bash
corepack pnpm dlx vercel dev
```

## Despliegue

Crear un proyecto Vercel independiente conectado a `VGPipa/cumpleanos_pipa`, con Framework Preset `Other`, rama de producción `main` y directorio raíz `./`.

Para publicarlo sin reemplazar la web principal, el proyecto que actualmente controla `cognitia.com.pe` debe redirigir la ruta sin slash y hacer proxy del resto:

```json
{
  "redirects": [
    {
      "source": "/cumpleanos-pipa",
      "destination": "/cumpleanos-pipa/",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/cumpleanos-pipa/:path*",
      "destination": "https://cumpleanos-pipa.vercel.app/:path*"
    }
  ]
}
```

El destino debe sustituirse por el dominio de producción real que Vercel asigne al proyecto. No se requieren cambios DNS en GoDaddy para una ruta bajo el dominio existente.
