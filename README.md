# Umbral de Historias

Plataforma web para descubrir, leer, publicar y traducir historias. Umbral de Historias reúne obras originales de la comunidad y fichas de obras externas aprobadas para traducción.

## Funcionalidades

- Registro e inicio de sesión con username único y perfiles públicos.
- Creación de obras originales, capítulos y colaboradores.
- Obras externas administradas por el equipo y traducciones por idioma.
- Lectura con preferencias personalizables y progreso individual por cuenta.
- Likes, comentarios, seguimientos de obras y seguimiento de autores.
- Explorar con búsqueda, géneros dinámicos, etiquetas y filtros.
- Notificaciones, reportes y panel de administración.
- Reglas de Firestore y Cloud Functions para proteger permisos, contadores y actividad.

## Tecnologías

- React
- Vite
- React Router
- Firebase Authentication
- Cloud Firestore
- Cloud Functions for Firebase
- CSS

## Ejecutar el proyecto

```bash
npm install
```

Copiá `.env.example` como `.env.local` y completá la configuración de tu aplicación web de Firebase. Después iniciá el proyecto:

```bash
npm run dev
```

Para crear una versión de producción:

```bash
npm run build
```

## Firebase

En Firebase Console habilitá Email/Password en Authentication y creá una base de Cloud Firestore. Para desplegar las reglas, índices y funciones:

```bash
npm install --prefix functions
firebase login
firebase use --add
firebase deploy --only firestore,functions
```

Las imágenes se gestionan actualmente mediante URLs externas; Firebase Storage no es necesario para ejecutar el proyecto.

## Documentación

- [Reglas y permisos de Firestore](docs/FIRESTORE_RULES.md)
- [Progreso de lectura y capítulos leídos](docs/READING_PROGRESS.md)
