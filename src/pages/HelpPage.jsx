import {
  BookOpen,
  CloudUpload,
  FolderOpen,
  LayoutDashboard,
  Library,
  ListMusic,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import EditorialCard from '../components/ui/EditorialCard.jsx'
import PageHeader from '../components/ui/PageHeader.jsx'

const sections = [
  {
    id: 'vision-general',
    label: 'Vision general',
    icon: BookOpen,
    intro: 'Una vista rapida para entender el flujo de trabajo completo dentro de la aplicacion.',
    points: [
      'La app trabaja primero en local. Tu carpeta activa guarda cantos, secuencias, categorias y exportaciones.',
      'Google Drive sirve como respaldo y sincronizacion, no como almacenamiento principal de trabajo.',
      'Los documentos DOCX se usan para importar o exportar, pero internamente la app guarda los datos de forma estructurada.',
    ],
  },
  {
    id: 'inicio',
    label: 'Inicio',
    icon: LayoutDashboard,
    intro: 'El tablero principal resume el estado de tu biblioteca y lo que viene para el siguiente servicio.',
    points: [
      'Muestra accesos rapidos a las areas principales de la app.',
      'Destaca secuencias proximas segun la fecha del servicio.',
      'Te ayuda a revisar de un vistazo si ya tienes repertorio y secuencias listas.',
    ],
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca de canciones',
    icon: Library,
    intro: 'Aqui se consultan y editan los cantos que ya forman parte de tu repertorio.',
    points: [
      'Puedes buscar por titulo, autor, letra o categoria.',
      'Cada tarjeta permite abrir un canto para revisarlo y editar sus datos.',
      'Los cambios solo se guardan cuando presionas Guardar cambios.',
    ],
  },
  {
    id: 'carga',
    label: 'Centro de carga',
    icon: CloudUpload,
    intro: 'Es la entrada oficial para dar de alta nuevos cantos.',
    points: [
      'Modo manual: crea un canto nuevo llenando titulo, autor, tonalidad, tempo, categoria y letra.',
      'Importacion DOCX: detecta varios cantos, permite revisarlos y decidir si se guardan, se omiten o actualizan uno existente.',
      'Desde aqui se evita duplicar cantos y se centraliza toda alta nueva.',
    ],
  },
  {
    id: 'secuencias',
    label: 'Secuencias',
    icon: ListMusic,
    intro: 'Las secuencias sirven para preparar el orden del servicio y luego exportarlo a Word.',
    points: [
      'La biblioteca de secuencias te deja abrir, editar y revisar las ya creadas.',
      'Dentro del constructor puedes agregar cantos, reordenarlos, cambiar titulo y fecha.',
      'La exportacion genera un documento DOCX compacto listo para escritorio o impresion.',
    ],
  },
  {
    id: 'carpeta',
    label: 'Carpeta de trabajo',
    icon: FolderOpen,
    intro: 'La app usa un almacenamiento administrado automaticamente para guardar tu biblioteca y tus secuencias.',
    points: [
      'No necesitas elegir manualmente una ruta para empezar a trabajar.',
      'La aplicacion crea y mantiene su propia estructura interna para cantos, secuencias, categorias y exportaciones.',
      'Esto ayuda a reducir errores por mover o borrar carpetas importantes accidentalmente.',
    ],
  },
  {
    id: 'busqueda',
    label: 'Busqueda y navegacion',
    icon: Search,
    intro: 'La barra superior y los menus laterales te permiten moverte y ubicar rapidamente lo importante.',
    points: [
      'La barra superior muestra la carpeta activa y accesos directos a las vistas principales.',
      'El signo de interrogacion abre esta guia de uso.',
      'Los menus laterales muestran las secciones principales y las opciones de ajustes.',
    ],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    icon: Settings,
    intro: 'Ajustes concentra modulos de configuracion para la aplicacion.',
    points: [
      'Categorias: administra el catalogo usado en filtros y formularios.',
      'Drive: conecta Google Drive y controla la sincronizacion.',
      'Animaciones: regula el movimiento visual segun el rendimiento de cada equipo.',
    ],
  },
  {
    id: 'drive',
    label: 'Sincronizacion con Drive',
    icon: Sparkles,
    intro: 'Drive respalda cantos, secuencias y categorias para mantener tus equipos alineados.',
    points: [
      'La sincronizacion ocurre al iniciar y al cerrar la app cuando hay una cuenta conectada.',
      'Tambien puedes forzarla manualmente desde Ajustes > Drive.',
      'Las preferencias visuales del equipo, como las animaciones, no se sincronizan.',
    ],
  },
]

function HelpPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Guia"
        title="Centro de ayuda"
        description="Consulta que hace cada seccion de la aplicacion y como aprovechar el flujo completo de cantos, secuencias y sincronizacion."
      />

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <EditorialCard className="h-fit xl:sticky xl:top-28">
          <div className="space-y-4">
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
                Navegacion interna
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
                Selecciona una seccion para ir directo al tema que quieres consultar.
              </p>
            </div>

            <nav className="space-y-2">
              {sections.map(({ id, label, icon: Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--surface-container-low)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                    <Icon size={16} />
                  </span>
                  <span>{label}</span>
                </a>
              ))}
            </nav>
          </div>
        </EditorialCard>

        <div className="space-y-5">
          {sections.map(({ id, label, icon: Icon, intro, points }) => (
            <EditorialCard key={id} className="scroll-mt-28 space-y-4" >
              <section id={id} className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                    <Icon size={20} />
                  </div>
                  <div className="space-y-2">
                    <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
                      {label}
                    </p>
                    <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                      {label}
                    </h2>
                    <p className="max-w-4xl text-sm leading-7 text-[var(--on-surface-variant)]">{intro}</p>
                  </div>
                </div>

                <div className="space-y-3 pl-16">
                  {points.map((point) => (
                    <div
                      key={point}
                      className="rounded-[20px] bg-[var(--surface-container-low)] px-4 py-4 text-sm leading-7 text-[var(--on-surface-variant)]"
                    >
                      {point}
                    </div>
                  ))}
                </div>
              </section>
            </EditorialCard>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HelpPage
