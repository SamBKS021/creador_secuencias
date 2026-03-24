<!-- app-notes:start -->
- Nuevo centro de soporte por correo dentro de la app.
- La guia ahora vive solo en el boton `?` de la cabecera.
- El soporte permite adjuntar imagenes, PDF y DOCX.
- Se configuro envio SMTP para soporte en desarrollo y release.
- Mejoras visuales en el cuerpo de los correos enviados.
<!-- app-notes:end -->

## Resumen
Release centrado en cerrar el flujo de soporte dentro de la app, separando la guia del contacto operativo y dejando listo el envio de correos con adjuntos por SMTP.

## Novedades principales
- Nueva pantalla `Soporte` para reportar errores o proponer mejoras desde la app.
- El flujo de soporte arma el asunto automaticamente segun el tipo de solicitud y el nombre del usuario.
- Se habilito adjuntar imagenes, archivos `PDF` y documentos `DOCX` en cada solicitud.
- El envio de soporte ahora funciona por `SMTP` con configuracion dedicada para desarrollo y releases.

## Mejoras de experiencia
- La guia quedo reservada para el boton `?` de la cabecera y ya no mezcla documentacion con soporte.
- La seccion de ayuda explica el flujo real de soporte segun la configuracion final.
- Se reordeno la pantalla de soporte para dejar la informacion operativa en la columna lateral y el formulario como foco principal.
- El cuerpo HTML del correo fue redisenado para verse mas limpio y legible en Gmail.

## Configuracion y release
- Se anadieron variables de entorno y secrets para el canal SMTP de soporte.
- El workflow de release ahora valida tambien la configuracion de soporte antes de publicar.
- El backend de soporte resuelve configuracion tanto desde build como desde `.env` en desarrollo para evitar falsos negativos.

## Correcciones
- Se corrigio la deteccion de configuracion SMTP en desarrollo.
- Se elimino un bloqueo de frontend que impedia ver errores reales del backend de soporte.
- Se corrigio la construccion MIME del correo para evitar que Gmail mostrara contenido duplicado.
