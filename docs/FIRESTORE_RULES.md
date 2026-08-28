# Firestore Security Rules

La fuente de verdad de roles y permisos es `usuarios/{uid}`. El documento `perfilesPublicos/{uid}` nunca autoriza acciones: sólo contiene datos aptos para mostrar públicamente.

| Colección             | Lectura                                            | Escritura desde cliente                                                                                                                   |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `usernames`           | Pública, sólo para comprobar disponibilidad         | La cuenta sólo reclama su username normalizado en el alta o migración atómica de su propio perfil.                                        |
| `usuarios`            | Sólo la propia cuenta o administración             | La propia cuenta sólo cambia nombre, bio, foto y visibilidad. Rol, permiso de traducción y contador quedan protegidos.                    |
| `perfilesPublicos`    | Pública, sin email ni progreso                     | La persona sólo actualiza campos visuales. `rol` y `seguidoresCount` los mantiene administración/servidor.                                |
| `obras`               | Pública                                            | Cualquier usuario crea originales; sólo admin crea externas. El propietario o admin edita colaboradores; colaboradores no pueden hacerlo. |
| `capitulos`           | Pública                                            | El propietario, un colaborador o admin crea capítulos de la obra. Sólo autor del capítulo, propietario o admin edita/elimina.             |
| `traducciones`        | Pública                                            | Crear exige admin, traductor, permiso manual o 200 capítulos leídos, y una obra externa. Administración modera, edita y elimina.          |
| `likes`               | Sólo el like propio o admin                        | Un usuario autenticado crea/elimina sólo su ID determinista de like para obra, capítulo o traducción.                                     |
| `seguimientos`        | Propios, admin o públicos si el perfil lo habilitó | Sólo el dueño crea, actualiza o elimina su seguimiento de obra.                                                                           |
| `seguimientosAutores` | Propio o admin                                     | Sólo el dueño puede seguir/dejar de seguir otro perfil; no puede seguirse a sí mismo.                                                     |
| `progresoLectura`     | Privado por usuario, admin                         | Sólo el usuario correspondiente actualiza su progreso.                                                                                    |
| `lecturasCapitulos`   | Privado por usuario, admin                         | Sólo se puede crear una vez con ID `{uid}_{capituloId}`. No hay update/delete de cliente.                                                 |
| `comentarios`         | Pública                                            | Cada autor edita/elimina el propio; admin puede moderar todos.                                                                            |
| `notificaciones`      | Destinatario o admin                               | El destinatario sólo marca las propias como leídas. Las crea el servidor.                                                                 |
| `reportes`            | Autor del reporte o admin                          | Cualquier usuario autenticado reporta contenido existente; admin revisa o elimina.                                                        |

## Consultas compatibles

Las consultas del cliente incluyen el dueño cuando leen progreso, notificaciones o seguimientos privados. Las colecciones públicas (`obras`, `capitulos`, `traducciones`, `comentarios`) se consultan directamente. Las reglas no son filtros: no cambies una consulta privada por una lectura completa de la colección.

Los likes y seguimientos usan IDs deterministas. Las reglas permiten que la cuenta autenticada consulte su propio documento aunque todavía no exista; esto es necesario para que el primer like o seguimiento no falle. No concede lectura de likes ni seguimientos existentes de otras personas.

## Despliegue

Desplegá reglas e índices después de elegir el proyecto Firebase nuevo:

```bash
firebase use --add
firebase deploy --only firestore
```

Las Cloud Functions de contadores, notificaciones y sincronización del badge público se despliegan aparte con `firebase deploy --only functions`.

Para verificar las rutas sensibles de manera local, con Java disponible para el emulador:

```bash
npm run test:rules
```
