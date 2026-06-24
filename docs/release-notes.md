<!-- app-notes:start -->
- Se agrego historial de uso para los cantos segun la fecha del servicio.
- El modal de editar canto ahora muestra un grafico anual de uso.
- El creador de secuencias permite consultar el uso de cada canto desde un modal.
- Los modales comparten una animacion consistente y respetan los ajustes de movimiento del sistema.
<!-- app-notes:end -->

## Resumen
Release centrado en ayudar a decidir mejor que cantos usar en cada secuencia, mostrando la frecuencia real de uso y unificando la experiencia de modales en la app.

## Novedades principales
- Cada canto guarda las fechas en que fue usado dentro de una secuencia, tomando como base la fecha del servicio.
- La biblioteca muestra el conteo de uso y la ultima fecha registrada para cada canto.
- El modal de editar canto incluye un grafico anual con los 12 meses y el total de usos del ano actual.
- En el creador de secuencias se agrego un boton de grafico junto al boton de eliminar para revisar el uso del canto sin salir del flujo.

## Mejoras de experiencia
- Se creo un contenedor reusable para modales con animacion uniforme.
- Los modales existentes fueron alineados a la misma animacion de entrada.
- Las animaciones de modales ahora respetan la preferencia del sistema: normal, reducida o desactivada.
- El grafico de uso fue ajustado para aprovechar mejor el espacio y mostrar la informacion de forma mas clara.

## Correcciones
- Se evito que el grafico de uso dentro del creador de secuencias quedara incrustado en el formulario principal.
- Se corrigio el alcance de las animaciones para que los modales renderizados en portal tambien obedezcan la configuracion de movimiento.
