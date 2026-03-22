# Creador de Secuencias

Aplicación de escritorio para administración musical litúrgica construida con `React + Vite + Tauri`.

El proyecto está orientado a uso real en escritorio e incluye:
- biblioteca de canciones
- centro de carga con importación desde `.docx`
- constructor de secuencias
- exportación DOCX
- sincronización local-first con Google Drive
- sistema de actualizaciones con GitHub Releases

## Estado actual

La base del producto ya está funcional:

- gestión de canciones
- edición de canciones existentes
- secuencias con reordenamiento
- exportación de secuencias a Word
- ajustes de categorías y animaciones
- ayuda integrada
- sincronización con Drive
- instalador para Windows
- detección y flujo de actualización de la app

## Stack

- `React 19`
- `Vite 8`
- `Tauri 2`
- `Tailwind CSS 4`
- `React Router`
- `@dnd-kit`
- `sileo`
- `Rust`
- `docx-rs`
- `reqwest`

## Módulos principales

- `Inicio`
  Panorama general, repertorio reciente y próximas secuencias.
- `Biblioteca`
  Consulta, filtros y edición de canciones existentes.
- `Centro de carga`
  Alta manual e importación por lotes desde `.docx`.
- `Secuencias`
  Biblioteca de secuencias guardadas.
- `Constructor de secuencias`
  Edición, orden, exportación y acciones rápidas de una secuencia.
- `Ajustes`
  Categorías, animaciones y sincronización con Drive.
- `Ayuda`
  Guía interna para usuarios.
- `Actualizaciones`
  Revisión manual del updater y estado de versiones.

## Rutas de la app

- `/` → Inicio
- `/biblioteca` → Biblioteca de canciones
- `/subir` → Centro de carga
- `/secuencias` → Biblioteca de secuencias
- `/constructor-secuencias` → Constructor de secuencias
- `/ajustes` → Ajustes
- `/ajustes/categorias` → CRUD de categorías
- `/ajustes/animaciones` → Preferencias de movimiento
- `/ajustes/drive` → Sincronización con Google Drive
- `/ayuda` → Documentación interna
- `/actualizaciones` → Estado del updater

## Almacenamiento local

La app ya no depende de que el usuario elija una carpeta manual.

Usa un workspace administrado por la propia aplicación dentro de `AppData`, más configuración local separada por equipo.

### Workspace administrado

```text
workspace/
├─ biblioteca/
│  └─ canto-xxxx/
│     ├─ meta.json
│     └─ content.json
├─ secuencias/
│  └─ <sequence-id>.json
├─ exports/
├─ recursos/
└─ .ccp/
   ├─ app-state.json
   ├─ drafts.json
   ├─ manifest.local.json
   ├─ song-categories.json
   └─ sync-state.json
```

### Configuración local del equipo

En `AppData` también se guardan archivos de configuración local, por ejemplo:

- `config.json`
- `oauth.json`

Aquí viven datos que no se sincronizan entre equipos, como:

- preferencias visuales
- estado local del updater
- configuración OAuth local

## Persistencia y sincronización

### Canciones

Cada canción se guarda por separado:

- `biblioteca/<song-id>/meta.json`
- `biblioteca/<song-id>/content.json`

### Secuencias

Cada secuencia se guarda en un archivo independiente:

- `secuencias/<sequence-id>.json`

Esto evita depender de un único archivo global para todas las secuencias.

### Categorías

Las categorías ya no viven en `config.json`. Se guardan como dato sincronizable en:

- `.ccp/song-categories.json`

### Google Drive

La sincronización usa:

- Google OAuth tipo Desktop App
- `appDataFolder`
- modelo `local-first`

Drive se usa para:

- canciones
- secuencias
- categorías
- manifest de sincronización
- manifest opcional de aviso de actualización

No se usa para:

- `.docx` exportados
- preferencias locales visuales
- secretos o credenciales sensibles

## Actualizaciones de la app

El proyecto usa dos capas:

- `GitHub Releases` para publicar actualizaciones reales
- `Drive` solo para enriquecer avisos opcionales

### Variables de build

Las variables mínimas están documentadas en [`.env.example`](./.env.example):

```env
GOOGLE_DRIVE_CLIENT_ID=
GOOGLE_DRIVE_CLIENT_SECRET=
APP_UPDATE_ENDPOINT=
TAURI_UPDATER_PUBLIC_KEY=
```

### Claves del updater

Genera las claves una sola vez:

```powershell
npm exec -- tauri signer generate -w "src-tauri/updater.key"
```

Eso produce:

- `src-tauri/updater.key`
- `src-tauri/updater.key.pub`

Uso:

- `src-tauri/updater.key` → `TAURI_SIGNING_PRIVATE_KEY` en GitHub Secrets
- contraseña elegida → `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- contenido de `src-tauri/updater.key.pub` → `TAURI_UPDATER_PUBLIC_KEY`

### Endpoint del updater

Ejemplo con GitHub Releases:

```env
APP_UPDATE_ENDPOINT=https://github.com/<owner>/<repo>/releases/latest/download/latest.json
```

### Documentación relacionada

Consulta también:

- [docs/actualizaciones.md](./docs/actualizaciones.md)

## Requisitos de desarrollo

### Frontend

- `Node.js 24+`
- `npm 11+`

### Tauri en Windows

- `Rust`
- `cargo`
- Microsoft C++ Build Tools
- WebView2 Runtime

Comprobaciones útiles:

```powershell
node -v
npm -v
rustc -V
cargo -V
```

## Instalación de dependencias

```powershell
npm install
```

## Scripts disponibles

```powershell
npm run dev
```
Levanta solo el frontend con Vite.

```powershell
npm run build
```
Genera el build web en `dist/`.

```powershell
npm run lint
```
Ejecuta ESLint.

```powershell
npm test
```
Ejecuta Vitest.

```powershell
npm run tauri:dev
```
Levanta la app de escritorio en modo desarrollo.

```powershell
npm run tauri:build
```
Genera instaladores de escritorio usando la configuración base local.

```powershell
npm run tauri:build:release
```
Genera build con la configuración pensada para releases y updater.

## Flujo recomendado de desarrollo

1. Instalar dependencias con `npm install`.
2. Levantar UI con `npm run dev`.
3. Verificar `npm run build`.
4. Verificar backend con `cargo check` dentro de `src-tauri`.
5. Probar integración nativa con `npm run tauri:dev`.

## Instalador

El proyecto genera instaladores para Windows desde Tauri.

Archivos típicos:

- `.exe` tipo setup
- `.msi`

Para builds release de verdad:

- el binario se firma para updater
- GitHub Actions publica assets y `latest.json`

## Publicación de releases

El flujo actual está pensado para GitHub Actions:

1. subir versión en:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/tauri.conf.json`
2. hacer commit
3. crear tag `vX.Y.Z`
4. empujar `main`
5. empujar el tag
6. dejar que el workflow publique el release

Workflow principal:

- [`.github/workflows/release.yml`](./.github/workflows/release.yml)

## Estructura del proyecto

```text
.
├─ src/
│  ├─ app/store/            # estado global y reducer
│  ├─ components/           # layout, shell y UI
│  ├─ features/             # componentes por dominio
│  ├─ layouts/              # shell principal de la app
│  ├─ pages/                # rutas de alto nivel
│  ├─ services/             # bridge Tauri / mock
│  ├─ utils/                # helpers y utilidades
│  └─ index.css             # tokens visuales y estilos globales
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands.rs
│  │  ├─ repository.rs
│  │  ├─ workspace.rs
│  │  ├─ drive_auth.rs
│  │  ├─ drive_client.rs
│  │  ├─ sync.rs
│  │  ├─ update.rs
│  │  ├─ export.rs
│  │  └─ models.rs
│  ├─ capabilities/
│  ├─ icons/
│  ├─ tauri.conf.json
│  └─ tauri.release.conf.json
├─ docs/
└─ README.md
```

## Notas importantes

- El updater real depende de que el repo de releases sea público o de un endpoint accesible públicamente.
- La app instalada no usa tu `.env` del equipo; los valores necesarios se inyectan en build.
- Los `.docx` exportados no son la fuente de verdad del sistema.
- Las preferencias de animaciones son locales por equipo.
- macOS puede soportarse, pero firma y notarización requieren preparación adicional con Apple Developer.

## Pendientes razonables

La base ya está cerrada, pero todavía hay espacio para:

- limpieza de warnings de Rust no utilizados
- más pruebas E2E de sincronización y updater
- soporte formal para macOS
- refinamiento de UX y documentación interna
