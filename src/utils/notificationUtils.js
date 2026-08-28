// Las notificaciones las genera Cloud Functions para que ningún cliente pueda
// crear avisos en nombre de otra persona.
export const NOTIFICATION_TYPES = {
  NEW_CHAPTER: "nuevo_capitulo",
  NEW_COMMENT: "nuevo_comentario",
  NEW_LIKE: "nuevo_like",
  NEW_TRANSLATED_CHAPTER: "nuevo_capitulo_traducido",
  TRANSLATION_PENDING: "traduccion_pendiente",
  TRANSLATION_APPROVED: "traduccion_aprobada",
};
