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
} from "lucide-react";
import { useMemo, useState } from "react";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";

const sections = [
  {
    id: "vision-general",
    label: "Visión general",
    icon: BookOpen,
    eyebrow: "Panorama",
    title: "Cómo está pensada la aplicación",
    summary:
      "Centro Musical trabaja con un enfoque local-first: tu equipo guarda los datos principales y Google Drive actúa como respaldo y sincronización.",
    highlights: [
      "Los cantos, secuencias y categorías viven en archivos estructurados dentro del almacenamiento administrado por la app.",
      "Los archivos DOCX se usan para importar o exportar, pero no son la base interna del sistema.",
      "La app puede seguir funcionando aunque Drive no esté disponible en ese momento.",
    ],
    tips: [
      "Usa Drive como respaldo entre equipos, no como carpeta de trabajo diario.",
      "Si vas a mover repertorio entre computadoras, sincroniza antes de cerrar y al volver a abrir.",
      "Mantener el trabajo diario dentro de la app evita perder cambios por archivos sueltos.",
    ],
  },
  {
    id: "inicio",
    label: "Inicio",
    icon: LayoutDashboard,
    eyebrow: "Vista principal",
    title: "Panorama del servicio y del repertorio",
    summary:
      "La pantalla de inicio te da una lectura rápida del estado actual de la biblioteca y de las secuencias próximas.",
    highlights: [
      "Resume cuántos cantos y secuencias tienes disponibles.",
      "Muestra accesos rápidos a las secciones que más se usan en el flujo diario.",
      "Ayuda a detectar si ya tienes preparado el siguiente servicio.",
    ],
    tips: [
      "Úsala como punto de entrada al abrir la app por primera vez en el día.",
      "Si una secuencia próxima no aparece, revisa la fecha del servicio.",
      "Desde aquí puedes saltar rápido a Biblioteca o Secuencias sin recorrer todo el menú.",
    ],
  },
  {
    id: "biblioteca",
    label: "Biblioteca de cantos",
    icon: Library,
    eyebrow: "Repertorio",
    title: "Consulta y edición de cantos guardados",
    summary:
      "Biblioteca de cantos es la vista para revisar repertorio existente, ajustar metadatos y corregir letra, tono o tempo.",
    highlights: [
      "Permite buscar por título, autor, tonalidad y otros datos del canto.",
      "Muestra solo los cantos guardados para aprovechar mejor el espacio de trabajo.",
      "Cada canto puede editarse con doble clic o desde los tres puntos de su tarjeta.",
    ],
    tips: [
      "Usa los filtros para mantenimiento rápido del repertorio, no para construir secuencias.",
      "Guarda cambios en el modal solo cuando confirmes que el canto quedó correcto.",
      "Si necesitas dar de alta un canto nuevo, hazlo desde Centro de carga.",
    ],
  },
  {
    id: "carga",
    label: "Centro de carga",
    icon: CloudUpload,
    eyebrow: "Altas nuevas",
    title: "Ingreso por documentos o alta manual",
    summary:
      "Centro de carga concentra la entrada de nuevos cantos. Desde el menú lateral puedes desplegarlo y elegir entre importar documentos o hacer un alta manual.",
    highlights: [
      "Importar documentos abre el flujo para archivos .docx y detecta varios cantos para revisarlos uno por uno.",
      "Alta manual muestra solo el formulario para crear un canto con título, autor, categoría, tonalidad, tempo y letra.",
      "Cuando encuentra coincidencias, te permite usar el existente, sobrescribirlo o guardar uno aparte.",
    ],
    tips: [
      "Abre Centro de carga desde la sidebar para ver sus dos opciones debajo del menú principal.",
      "Si importas varios documentos, revisa cada canto con calma antes de confirmar.",
      "Si una categoría no existe, créala primero desde Ajustes antes de dar de alta el canto.",
    ],
  },
  {
    id: "secuencias",
    label: "Secuencias",
    icon: ListMusic,
    eyebrow: "Orden del servicio",
    title: "Preparación, reordenamiento y exportación",
    summary:
      "Aquí construyes el flujo del servicio agregando cantos, reordenándolos y preparando el documento final para compartir.",
    highlights: [
      "La columna izquierda usa la biblioteca completa y su propia búsqueda local.",
      "Puedes arrastrar cantos dentro de la secuencia para cambiar el orden libremente.",
      "La exportación genera un DOCX compacto listo para escritorio o impresión (con o sin notas).",
    ],
    tips: [
      "Guarda la secuencia antes de exportar para no perder cambios recientes.",
      "Si trabajas en varios equipos, sincroniza antes de abrir una secuencia importante.",
      "Revisa título y fecha del servicio antes de compartir el documento final.",
    ],
  },
  {
    id: "almacenamiento",
    label: "Almacenamiento local",
    icon: FolderOpen,
    eyebrow: "Base local",
    title: "Cómo guarda la app su información",
    summary:
      "La aplicación administra su propio espacio de trabajo para reducir errores por mover o borrar carpetas manualmente.",
    highlights: [
      "No necesitas elegir una ruta para empezar a trabajar.",
      "La estructura interna separa biblioteca, secuencias, categorías, borradores y exportaciones.",
      "Esto hace más estable el respaldo y la sincronización entre equipos.",
    ],
    tips: [
      "Evita modificar a mano los archivos internos si no es necesario.",
      "Haz respaldo de la app a través de Drive, no copiando carpetas al azar.",
      "Si cambias de equipo, usa sincronización y no solo copiar documentos exportados.",
    ],
  },
  {
    id: "busqueda",
    label: "Búsqueda y navegación",
    icon: Search,
    eyebrow: "Movimiento rápido",
    title: "Dónde están los accesos importantes",
    summary:
      "La barra superior, los menús laterales y esta guía están pensados para ayudarte a llegar rápido a cada módulo.",
    highlights: [
      "La barra superior mantiene accesos directos a las vistas principales.",
      "El icono de ayuda con el signo ? abre esta documentación integrada en cualquier momento.",
      "La sidebar concentra la navegación principal y despliega Centro de carga en Importar documentos y Alta manual.",
    ],
    tips: [
      "Usa Inicio como pivote y la sidebar para saltar entre módulos sin perder contexto.",
      "Si ves una campana activa, revisa Actualizaciones antes de seguir trabajando.",
      "Cuando necesites reportar algo, entra a Soporte en lugar de mezclarlo con la guía.",
    ],
  },
  {
    id: "soporte",
    label: "Soporte",
    icon: Sparkles,
    eyebrow: "Contacto y seguimiento",
    title: "Cómo enviar errores y propuestas de mejora",
    summary:
      "La sección Soporte quedó reservada para contacto operativo. Desde aquí puedes enviar solicitudes al equipo sin salir de la app, con asunto armado automáticamente según el tipo de solicitud.",
    highlights: [
      "Puedes elegir entre reportar un error o proponer una mejora antes de redactar el mensaje.",
      "El formulario pide tu nombre, una cabecera corta y el detalle completo de lo que quieres enviar; no necesitas escribir el asunto completo a mano.",
      "Admite imágenes, archivos PDF y documentos DOCX para explicar mejor el caso y los manda junto al envío.",
    ],
    tips: [
      "Si vas a reportar un error, explica qué intentabas hacer, qué pasó y si puedes repetirlo.",
      "La cabecera que escribes se usa para completar el asunto final junto con el prefijo [BUG] o [MEJORA] y tu nombre.",
      "La app agrega la versión y la plataforma automáticamente, así que tú solo concéntrate en describir bien el caso.",
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: Settings,
    eyebrow: "Configuración",
    title: "Módulos de personalización y mantenimiento",
    summary:
      "Ajustes agrupa los catálogos y preferencias locales del equipo para adaptar la app sin tocar los datos principales del repertorio.",
    highlights: [
      "Categorías administra el catálogo usado en formularios y filtros.",
      "Drive controla la conexión, el estado y la sincronización entre equipos.",
      "Animaciones y temas ajustan la experiencia visual según cada computadora.",
    ],
    tips: [
      "Los temas y animaciones son locales por equipo, no se sincronizan.",
      "Si cambias una categoría en uso, la app actualiza los cantos asociados.",
      "Revisa Ajustes cuando agregues un nuevo equipo al flujo de trabajo.",
    ],
  },
  {
    id: "drive",
    label: "Sincronización con Drive",
    icon: Sparkles,
    eyebrow: "Respaldo entre equipos",
    title: "Cómo mantener varios equipos alineados",
    summary:
      "Drive respalda cantos, secuencias y categorías para que puedas continuar el trabajo en otra computadora con la misma cuenta.",
    highlights: [
      "La app sincroniza al iniciar y al cerrar cuando hay una cuenta conectada.",
      "También puedes forzar una sincronización manual desde Ajustes > Drive.",
      "Si hay conflicto entre equipos, la app te pide decidir qué versión conservar.",
    ],
    tips: [
      "Antes de cambiar de equipo, sincroniza manualmente para evitar dudas.",
      "Si es la primera vez con una cuenta, elige si deseas subir lo local o traer lo que ya existe en Drive.",
      "Las categorías también forman parte del respaldo, junto con cantos y secuencias.",
    ],
  },
];

function HelpPage() {
  const [selectedId, setSelectedId] = useState(sections[0].id);

  const activeSection = useMemo(
    () => sections.find((section) => section.id === selectedId) || sections[0],
    [selectedId],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Guía"
        title="Centro de ayuda"
        description="Consulta qué hace cada sección de la aplicación, cómo navegarla desde el botón ? y en qué momento conviene usar Soporte para enviar errores o propuestas al equipo."
      />

      <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="self-start xl:sticky xl:top-6">
          <EditorialCard className="overflow-hidden xl:max-h-[calc(100vh-9rem)]">
            <div className="space-y-4">
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
                  Navegación interna
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
                  Elige un tema y el panel de la derecha actualizará su contenido al instante.
                </p>
              </div>

              <nav className="sidebar-scroll max-h-[calc(100vh-17rem)] space-y-2 overflow-y-auto pr-2">
                {sections.map((section) => {
                  const active = section.id === selectedId;
                  const SectionIcon = section.icon;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setSelectedId(section.id)}
                      className={[
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition",
                        active
                          ? "bg-[var(--surface-container-low)] text-[var(--primary)] shadow-[var(--card-shadow)]"
                          : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] hover:text-[var(--primary)]",
                      ].join(" ")}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-container-lowest)] text-[var(--primary)]">
                        <SectionIcon size={16} />
                      </span>
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </EditorialCard>
        </div>

        <EditorialCard
          key={activeSection.id}
          className="motion-help-panel space-y-6 overflow-hidden xl:min-h-[calc(100vh-9rem)]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[var(--surface-container-low)] text-[var(--primary)]">
              <activeSection.icon size={24} />
            </div>
            <div className="space-y-2">
              <p className="font-headline text-xs font-bold uppercase tracking-[0.28em] text-[var(--outline)]">
                {activeSection.eyebrow}
              </p>
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-[var(--primary)]">
                {activeSection.title}
              </h2>
              <p className="max-w-4xl text-base leading-8 text-[var(--on-surface-variant)]">{activeSection.summary}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-[var(--outline)]">
                  Qué puedes hacer aquí
                </p>
              </div>
              <div className="space-y-3">
                {activeSection.highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] bg-[var(--surface-container-low)] px-5 py-4 text-sm leading-7 text-[var(--on-surface-variant)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-[var(--outline)]">
                  Consejos rápidos
                </p>
              </div>
              <div className="space-y-3">
                {activeSection.tips.map((item) => (
                  <div
                    key={item}
                    className="rounded-[22px] border border-[rgba(67,71,78,0.08)] bg-[var(--surface-container-lowest)] px-5 py-4 text-sm leading-7 text-[var(--on-surface-variant)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </EditorialCard>
      </div>
    </div>
  );
}

export default HelpPage;
