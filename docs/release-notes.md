<!-- app-notes:start -->
- Sincronización con Google Drive lista para otros equipos.
- Nuevos temas visuales: claro, oscuro y retro 2000s.
- Mejoras en ayuda, drag and drop y exportación DOCX.
- Correcciones de desbordes, scroll y detalles visuales en varias pantallas.
- Ajustes de estabilidad y experiencia general de uso.
<!-- app-notes:end -->

## Resumen
Primera versión base sólida de la aplicación con sincronización en Google Drive, actualizaciones desde GitHub Releases y una ronda amplia de mejoras visuales y de experiencia de uso.

## Novedades principales
- Se completó la base funcional para gestión de cantos, secuencias, categorías y exportación DOCX.
- Se integró sincronización local-first con Google Drive usando `appDataFolder`.
- Se habilitó el sistema de actualizaciones desde GitHub Releases con detección dentro de la app.
- Se añadieron temas visuales `Claro`, `Oscuro` y `Retro 2000s`.

## Mejoras de experiencia
- Nuevo splash de inicio con progreso visual.
- Nueva guía de ayuda y soporte dentro de la app con navegación lateral.
- Mejoras visuales en top bar, sidebar, scroll interno y estructura general del layout.
- Afinado de contraste, jerarquía visual, espaciados y consistencia entre pantallas.
- Ajustes de copy y corrección de textos visibles.

## Secuencias
- El constructor de secuencias recuperó el reordenamiento con drag and drop.
- Se corrigió el comportamiento visual del arrastre para evitar parpadeos y desbordes.
- La biblioteca del constructor ya no hereda los filtros activos de la biblioteca principal.
- Se mejoró el panel de exportación DOCX para mostrar información útil sin rutas técnicas largas.

## Sincronización y actualizaciones
- Las credenciales de Drive ahora se incorporan correctamente en los builds de release para funcionar en otros equipos.
- Se corrigieron varios puntos del flujo de sincronización inicial y del estado de conexión.
- La app ya puede detectar nuevas versiones publicadas y mostrarlas desde la campana y la pantalla de actualizaciones.

## Correcciones
- Corrección de textos dañados por encoding en distintas pantallas.
- Mejoras de contraste en modo oscuro.
- Ajustes del tema retro 2000s para darle una identidad más fuerte y mejor legibilidad.
- Corrección de desbordes visuales, scrolls no deseados y detalles de layout en varias vistas.
