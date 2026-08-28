# Progreso y capítulos leídos

`progresoLectura/{uid_obraId}` conserva solamente el punto de lectura de una obra. Se puede actualizar muchas veces y es privado; por eso no sirve como base fiable para contar capítulos.

## Registro individual

Al abrir un capítulo, el cliente intenta crear `lecturasCapitulos/{uid_capituloId}` con:

- `usuarioId`
- `obraId`
- `capituloId`
- `traduccionId`
- `fechaPrimeraLectura`

El ID determinista impide registrar dos veces el mismo capítulo para una misma cuenta. Las reglas sólo permiten crear el documento si pertenece al usuario autenticado, el capítulo existe y corresponde a la obra indicada. No permiten actualizarlo ni borrarlo desde el cliente.

`usuarios/{uid}.capitulosLeidos` permanece protegido: el cliente nunca puede escribirlo. El requisito de elegibilidad configurado actualmente es de 200 capítulos.

## Contador de servidor actual

La Cloud Function `onChapterReadCreated` se ejecuta al crear una lectura individual y:

1. Verifica que el ID tenga el formato `{uid}_{capituloId}` y coincida con los campos guardados.
2. Comprueba con Admin SDK que el capítulo exista y pertenezca a la obra indicada.
3. Usa una transacción para incrementar `usuarios/{uid}.capitulosLeidos` una sola vez y marca el evento como procesado.

Por eso el contador no puede ser modificado desde React ni incrementado dos veces creando el mismo documento. Esta función requiere que `functions/index.js` esté desplegado en el proyecto Firebase.

## Próxima mejora antiabuso

Las reglas eliminan la manipulación directa del contador, pero una apertura de capítulo no demuestra por sí sola que alguien leyó todo el texto. Antes de conceder permisos de forma automática, conviene añadir límites de frecuencia, señales de tiempo de lectura y una solicitud/revisión administrativa. La política se centraliza en `TRANSLATOR_REQUIREMENTS` y nunca debe asignar el rol `admin` automáticamente.
