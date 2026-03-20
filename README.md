# Creador de Secuencias

Aplicación de escritorio para gestión musical litúrgica construida con `React + Vite + Tauri`, usando JavaScript y una interfaz editorial en español.

El proyecto parte de pantallas HTML generadas con Stitch y las transforma en una app evolutiva para escritorio, con rutas por pantalla, layout compartido, componentes reutilizables, persistencia local por carpeta de trabajo y exportación de secuencias a DOCX.

## Qué incluye

- Pantalla de inicio con métricas, repertorio reciente y secuencias próximas
- Biblioteca de canciones con búsqueda, filtros y edición
- Centro de carga para importar `.docx` como borradores editables
- Constructor de secuencias con drag-and-drop
- Exportación DOCX con:
  - portada
  - fecha del servicio
  - canciones en orden
  - título y metadatos básicos
  - letra completa
  - acordes cuando existen
- Backend Tauri con persistencia JSON en una carpeta raíz elegida por el usuario

## Stack

- `React 19`
- `Vite 8`
- `Tauri 2`
- `Tailwind CSS 4` integrado con Vite
- `React Router`
- `@dnd-kit` para reordenamiento
- `Vitest` para pruebas
- `Rust` para la capa nativa y exportación DOCX

## Estructura del proyecto

```text
.
├─ src/
│  ├─ app/store/              # estado global y reducer
│  ├─ components/             # layout y UI reutilizable
│  ├─ features/               # bloques funcionales por dominio
│  ├─ pages/                  # rutas principales
│  ├─ services/               # bridge Tauri / fallback web
│  ├─ utils/                  # formateo y helpers
│  └─ index.css               # tokens visuales y estilos globales
├─ src-tauri/
│  ├─ src/
│  │  ├─ commands.rs          # comandos expuestos al frontend
│  │  ├─ workspace.rs         # manejo de carpeta raíz y config
│  │  ├─ repository.rs        # lectura/escritura JSON
│  │  ├─ export.rs            # generación DOCX
│  │  └─ models.rs            # modelos compartidos
│  ├─ icons/
│  └─ tauri.conf.json
└─ _stitch_source/            # referencia visual original
```

## Rutas de la app

- `/` → Inicio
- `/biblioteca` → Biblioteca de canciones
- `/subir` → Centro de carga
- `/constructor-secuencias` → Constructor de secuencias

## Cómo funciona la persistencia

La app no guarda la librería principal en `AppData`.

Usa una carpeta raíz elegida por el usuario, pensada para vivir dentro de Google Drive o una carpeta sincronizada similar. Dentro de esa raíz se crea esta estructura:

```text
library/songs.json
sequences/sequences.json
drafts/drafts.json
exports/*.docx
```

En `AppData` solo se guarda configuración ligera:

- última carpeta raíz usada
- raíces recientes
- preferencias de interfaz

## Requisitos

Para desarrollo web:

- `Node.js 24+`
- `npm 11+`

Para desarrollo Tauri en Windows:

- `Rust` y `cargo`
- Microsoft C++ Build Tools
- WebView2 Runtime

Comprobaciones útiles:

```powershell
node -v
npm -v
rustc -V
cargo -V
```

## Instalación

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
Ejecuta las pruebas con Vitest.

```powershell
npm run tauri dev
```
Levanta la app de escritorio en modo desarrollo.

```powershell
npm run tauri build
```
Compila el ejecutable de escritorio.

## Flujo recomendado de desarrollo

1. Instalar dependencias con `npm install`
2. Probar la interfaz web con `npm run dev`
3. Verificar calidad con `npm run lint` y `npm test`
4. Ejecutar la app nativa con `npm run tauri dev`

## Notas importantes

- `sourcePath` se guarda solo como dato informativo.
- La identidad de canciones y secuencias depende del `id`, no de rutas absolutas.
- `src-tauri/target/`, `dist/` y `node_modules/` están ignorados por Git y no deben subirse al repositorio.
- Si `npm run tauri dev` falla por iconos, confirma que exista `src-tauri/icons/icon.ico`.

## Estado actual

El proyecto ya tiene:

- frontend funcional
- rutas en español
- store global
- fallback web para desarrollo sin runtime nativo
- backend Tauri preparado para workspace local y exportación DOCX

## Próximas mejoras posibles

- parseo real de `.docx` de entrada
- persistencia con SQLite
- plantillas DOCX personalizables
- autenticación o perfiles de ministerio
- vista de impresión previa antes de exportar
