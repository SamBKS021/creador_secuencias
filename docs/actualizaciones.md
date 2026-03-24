# Sistema de actualizaciones

## Variables de build local

El updater usa estas variables durante el build:

- `APP_UPDATE_ENDPOINT`: URL pública del JSON del updater.
- `TAURI_UPDATER_PUBLIC_KEY`: clave pública del updater.

Puedes ponerlas en `.env` local a partir de `.env.example`.

## Claves del updater

Genera las claves una sola vez:

```bash
npx tauri signer generate -w src-tauri/updater.key
```

Eso produce:

- `src-tauri/updater.key`
- `src-tauri/updater.key.pub`

Usa:

- `src-tauri/updater.key` como secreto de GitHub: `TAURI_SIGNING_PRIVATE_KEY`
- la contraseña elegida como secreto: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- el contenido de `src-tauri/updater.key.pub` en `.env` y en GitHub como `TAURI_UPDATER_PUBLIC_KEY`

## Endpoint público del updater

La app no descarga updates desde Drive. El endpoint debe ser público y apuntar al JSON del updater publicado con GitHub Releases.

Ejemplo:

```env
APP_UPDATE_ENDPOINT=https://github.com/<owner>/<repo>/releases/latest/download/latest.json
```

## Manifest opcional en Drive

Drive solo se usa para enriquecer el aviso visual con `update-manifest.json` dentro de `appDataFolder`.

Shape recomendado:

```json
{
  "version": "0.2.0",
  "title": "Actualización disponible",
  "notes": [
    "Mejoras en sincronización",
    "Correcciones de exportación DOCX"
  ],
  "visible": true,
  "severity": "normal"
}
```

## GitHub Actions

El workflow `.github/workflows/release.yml` está preparado para:

- compilar el release en Windows
- firmar el updater
- publicar assets en GitHub Releases
- usar el contenido de `docs/release-notes.md` como cuerpo del release

Secrets necesarios:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `APP_UPDATE_ENDPOINT`
- `TAURI_UPDATER_PUBLIC_KEY`
- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`

Para macOS además:

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`

## Notas del release

Antes de crear un tag nuevo, actualiza:

- `docs/release-notes.md`

Ese archivo se publica como:

- descripción visible del release en GitHub
- fuente principal de notas que verá la app en la pantalla de actualizaciones

Si quieres que la app muestre una versión corta y más limpia de las novedades, edita el bloque entre:

- `<!-- app-notes:start -->`
- `<!-- app-notes:end -->`

Mantén las notas:

- en español
- cortas y agrupadas por impacto
- centradas en cambios reales visibles para el usuario

## Flujo recomendado

1. Actualizar versión en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json`.
2. Editar `docs/release-notes.md` con los cambios de esa versión.
3. Crear tag `vX.Y.Z`.
4. GitHub Actions compila, firma y publica el release.
5. Actualizar `update-manifest.json` en Drive si quieres mostrar aviso enriquecido.
