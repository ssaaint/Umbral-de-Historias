# Umbral de Historias

Plataforma de lectura y escritura con React, Vite, Firebase Authentication, Cloud Firestore y Cloud Functions. El proyecto usa exclusivamente el modelo canónico de `obras`; no hay una capa de compatibilidad ni documentos espejo.

## Puesta en marcha

1. Creá un proyecto nuevo en Firebase Console y registrá una app web.
2. En **Authentication**, habilitá el proveedor **Email/Password**.
3. En **Firestore Database**, creá la base en modo producción.
4. Copiá `.env.example` como `.env.local` y completá los valores de configuración pública de la app web:

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
```

No agregues cuentas de servicio, claves privadas ni configuración de Storage. Las portadas e imágenes de capítulos son URLs externas por ahora.

5. Instalá y ejecutá la aplicación:

```bash
npm install
npm run dev
```

6. Para desplegar las reglas, índices y automatizaciones, instalá Firebase CLI, iniciá sesión y elegí el proyecto correcto. Las funciones requieren Node.js 20 al desplegarse.

```bash
npm install --prefix functions
firebase use --add
firebase deploy --only firestore,functions
```

Las Cloud Functions mantienen contadores, notificaciones y limpieza de contenido eliminado. Para desplegarlas Firebase puede requerir habilitar facturación según tu plan y región.

## Primer administrador

1. Creá tu cuenta con la aplicación (eso crea `usuarios/{uid}` y `perfilesPublicos/{uid}`).
2. Copiá el UID desde Firebase Authentication.
3. En Firestore Console, editá **solamente desde la consola o una herramienta de administración confiable** `usuarios/{uid}` y cambiá:

```json
{ "rol": "admin" }
```

La aplicación reconoce ese rol en el siguiente refresco de sesión. Con las Cloud Functions desplegadas, el badge público se sincroniza automáticamente; si todavía no las desplegaste, actualizá también `perfilesPublicos/{uid}.rol` a `admin` desde la consola. No existe ningún flujo de cliente para autoasignarse ese rol.

## Modelo de Firestore

Colecciones raíz:

- `usernames/{usernameNormalizado}`: reclamación única de username, usada para registrar y buscar cuentas sin exponer UID.
- `usuarios/{uid}`: perfil privado y permisos. Incluye `uid`, `nombre`, `username`, `email`, `bio`, `fotoUrl`, `rol`, `puedeTraducir`, `capitulosLeidos`, `createdAt` y `updatedAt`.
- `perfilesPublicos/{uid}`: subconjunto público sin email ni información privada, con username y contadores de seguidores/siguiendo. Es necesario porque Firestore no permite ocultar campos de un documento público.
- `obras/{obraId}`: obras originales o externas. Incluye autor de plataforma, origen de una obra externa, géneros, etiquetas, slug autogenerado y contadores.
- `capitulos/{capituloId}`: capítulos de la obra. `traduccionId` es `null` para el original o apunta a una traducción concreta. `bloques` admite `texto`, `imagen` y `separador`.
- `traducciones/{traduccionId}`: idioma, traductor principal, colaboradores de la traducción y estado.
- `comentarios/{comentarioId}`: comentarios y respuestas, con `tipoContenido`, `contenidoId`, `obraId` y `padreId`.
- `likes/{tipoContenido_contenidoId_uid}`: relación única y escalable para obra, capítulo o traducción.
- `seguimientos/{uid_obraId}`: relación de seguimiento y último capítulo conocido.
- `seguimientosAutores/{uid_autorId}`: relación única para seguir perfiles/autores.
- `progresoLectura/{uid_obraId}`: progreso estrictamente privado por usuario y obra.
- `notificaciones/{notificacionId}`: avisos generados por funciones de servidor; el destinatario sólo marca los propios como leídos.
- `reportes/{uid_tipoContenido_contenidoId}`: reportes de moderación.

## Permisos y reglas

`firestore.rules` restringe cada escritura por autenticación, propietario, colaborador, traductor o administrador. Los campos de rol, permiso de traducción, email, contadores y autoría están protegidos frente al cliente.

- Una persona sólo edita su perfil y su progreso.
- Los colaboradores crean capítulos y sólo editan o eliminan los propios; no administran colaboradores ni propiedad.
- Traducir requiere `rol: "traductor"`, `puedeTraducir: true`, 200 capítulos leídos o `rol: "admin"`.
- Las estadísticas y notificaciones no se escriben desde React: las actualizan las funciones de Firebase después de acciones válidas.
- Los perfiles públicos no exponen email, progreso ni notificaciones.

Los índices requeridos están en `firestore.indexes.json`. Desplegalos con el comando anterior antes de probar filtros, progreso y notificaciones.

## Verificación local

```bash
npm run lint
npm run build
npm run test:rules
node --check functions/index.js
```

Documentación adicional: [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md) y [`docs/READING_PROGRESS.md`](docs/READING_PROGRESS.md).
