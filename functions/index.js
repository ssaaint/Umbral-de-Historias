import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";

initializeApp();
const db = getFirestore();

const targetReference = (type, id) => {
  if (type === "obra") return db.collection("obras").doc(id);
  if (type === "capitulo") return db.collection("capitulos").doc(id);
  if (type === "traduccion") return db.collection("traducciones").doc(id);
  return null;
};

async function contentOwner(type, id) {
  const snapshot = await targetReference(type, id)?.get();
  if (!snapshot?.exists) return null;
  const data = snapshot.data();
  if (type === "traduccion")
    return {
      userId: data.traductorPrincipalId,
      title: data.idioma || "tu traducción",
    };
  if (type === "capitulo")
    return { userId: data.autorId, title: data.titulo || "tu capítulo" };
  return { userId: data.autorId, title: data.titulo || "tu obra" };
}

async function notify({
  userId,
  type,
  title,
  message,
  link,
  actorId = "",
  id,
}) {
  if (!userId || userId === actorId) return;
  await db
    .collection("notificaciones")
    .doc(id || db.collection("notificaciones").doc().id)
    .set({
      usuarioId: userId,
      tipo: type,
      titulo: title,
      mensaje: message,
      link,
      actorId,
      leida: false,
      createdAt: FieldValue.serverTimestamp(),
    });
}

async function changeCounter(reference, field, amount) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) return;
    const current = Number(snapshot.data()[field] || 0);
    transaction.update(reference, { [field]: Math.max(0, current + amount) });
  });
}

export const onLikeCreated = onDocumentCreated(
  "likes/{likeId}",
  async (event) => {
    const like = event.data.data();
    const target = targetReference(like.tipoContenido, like.contenidoId);
    if (!target) return;
    await changeCounter(target, "likes", 1);
    const owner = await contentOwner(like.tipoContenido, like.contenidoId);
    await notify({
      userId: owner?.userId,
      type: "nuevo_like",
      title: "Nuevo like",
      message: `A alguien le gustó ${owner?.title || "tu contenido"}.`,
      link:
        like.tipoContenido === "obra"
          ? `/obra/${like.contenidoId}`
          : `/obra/${like.obraId}`,
      actorId: like.usuarioId,
      id: `like_${event.params.likeId}`,
    });
  },
);

export const onLikeDeleted = onDocumentDeleted(
  "likes/{likeId}",
  async (event) => {
    const like = event.data.data();
    const target = targetReference(like.tipoContenido, like.contenidoId);
    if (target) await changeCounter(target, "likes", -1);
  },
);

export const onCommentCreated = onDocumentCreated(
  "comentarios/{commentId}",
  async (event) => {
    const comment = event.data.data();
    const target = targetReference(comment.tipoContenido, comment.contenidoId);
    if (target) await changeCounter(target, "comentariosCount", 1);
    const owner = await contentOwner(
      comment.tipoContenido,
      comment.contenidoId,
    );
    await notify({
      userId: owner?.userId,
      type: "nuevo_comentario",
      title: "Nuevo comentario",
      message: `${comment.autorNombre || "Alguien"} comentó en ${owner?.title || "tu contenido"}.`,
      link:
        comment.tipoContenido === "obra"
          ? `/obra/${comment.contenidoId}`
          : `/obra/${comment.obraId}`,
      actorId: comment.autorId,
      id: `comment_${event.params.commentId}`,
    });
    if (comment.padreId) {
      const parent = await db
        .collection("comentarios")
        .doc(comment.padreId)
        .get();
      if (parent.exists)
        await notify({
          userId: parent.data().autorId,
          type: "respuesta",
          title: "Nueva respuesta",
          message: `${comment.autorNombre || "Alguien"} respondió a tu comentario.`,
          link: `/obra/${comment.obraId}`,
          actorId: comment.autorId,
          id: `reply_${event.params.commentId}`,
        });
    }
  },
);

export const onCommentDeleted = onDocumentDeleted(
  "comentarios/{commentId}",
  async (event) => {
    const comment = event.data.data();
    const target = targetReference(comment.tipoContenido, comment.contenidoId);
    if (target) await changeCounter(target, "comentariosCount", -1);
  },
);

export const onFollowCreated = onDocumentCreated(
  "seguimientos/{followId}",
  async (event) => {
    const follow = event.data.data();
    await changeCounter(
      db.collection("obras").doc(follow.obraId),
      "seguidoresCount",
      1,
    );
  },
);

export const onFollowDeleted = onDocumentDeleted(
  "seguimientos/{followId}",
  async (event) => {
    const follow = event.data.data();
    await changeCounter(
      db.collection("obras").doc(follow.obraId),
      "seguidoresCount",
      -1,
    );
  },
);

export const onChapterCreated = onDocumentCreated(
  "capitulos/{chapterId}",
  async (event) => {
    const chapter = event.data.data();
    const workRef = db.collection("obras").doc(chapter.obraId);
    if (chapter.traduccionId) {
      await changeCounter(
        db.collection("traducciones").doc(chapter.traduccionId),
        "capitulosCount",
        1,
      );
    } else {
      await changeCounter(workRef, "capitulosCount", 1);
    }
    await workRef
      .update({ fechaActualizacion: FieldValue.serverTimestamp() })
      .catch(() => {});
    const followers = await db
      .collection("seguimientos")
      .where("obraId", "==", chapter.obraId)
      .get();
    const type = chapter.traduccionId
      ? "nuevo_capitulo_traducido"
      : "nuevo_capitulo";
    await Promise.all(
      followers.docs.map((follower) =>
        notify({
          userId: follower.data().usuarioId,
          type,
          title: "Nuevo capítulo",
          message: `Hay un nuevo capítulo: ${chapter.titulo}.`,
          link: `/obra/${chapter.obraId}/capitulo/${event.params.chapterId}${chapter.traduccionId ? `?traduccion=${chapter.traduccionId}` : ""}`,
          actorId: chapter.autorId,
          id: `chapter_${event.params.chapterId}_${follower.id}`,
        }),
      ),
    );
  },
);

export const onChapterDeleted = onDocumentDeleted(
  "capitulos/{chapterId}",
  async (event) => {
    const chapter = event.data.data();
    if (chapter.traduccionId)
      await changeCounter(
        db.collection("traducciones").doc(chapter.traduccionId),
        "capitulosCount",
        -1,
      );
    else
      await changeCounter(
        db.collection("obras").doc(chapter.obraId),
        "capitulosCount",
        -1,
      );
  },
);

export const onTranslationCreated = onDocumentCreated(
  "traducciones/{translationId}",
  async (event) => {
    const translation = event.data.data();
    await changeCounter(
      db.collection("obras").doc(translation.obraId),
      "traduccionesCount",
      1,
    );
  },
);

export const onTranslationDeleted = onDocumentDeleted(
  "traducciones/{translationId}",
  async (event) => {
    const translation = event.data.data();
    await changeCounter(
      db.collection("obras").doc(translation.obraId),
      "traduccionesCount",
      -1,
    );
  },
);

export const onProgressCreated = onDocumentCreated(
  "progresoLectura/{progressId}",
  async (event) => {
    const progress = event.data.data();
    await changeCounter(
      db.collection("obras").doc(progress.obraId),
      "vistas",
      1,
    );
  },
);

export const onAuthorFollowCreated = onDocumentCreated(
  "seguimientosAutores/{followId}",
  async (event) => {
    const follow = event.data.data();
    await Promise.all([
      changeCounter(
        db.collection("perfilesPublicos").doc(follow.autorId),
        "seguidoresCount",
        1,
      ),
      changeCounter(
        db.collection("perfilesPublicos").doc(follow.usuarioId),
        "siguiendoCount",
        1,
      ),
    ]);
  },
);

export const onAuthorFollowDeleted = onDocumentDeleted(
  "seguimientosAutores/{followId}",
  async (event) => {
    const follow = event.data.data();
    await Promise.all([
      changeCounter(
        db.collection("perfilesPublicos").doc(follow.autorId),
        "seguidoresCount",
        -1,
      ),
      changeCounter(
        db.collection("perfilesPublicos").doc(follow.usuarioId),
        "siguiendoCount",
        -1,
      ),
    ]);
  },
);

export const onChapterReadCreated = onDocumentCreated(
  "lecturasCapitulos/{readingId}",
  async (event) => {
    const readingRef = event.data.ref;
    const reading = event.data.data();
    const expectedId = `${reading.usuarioId}_${reading.capituloId}`;
    if (event.params.readingId !== expectedId) return;

    const chapterRef = db.collection("capitulos").doc(reading.capituloId);
    const userRef = db.collection("usuarios").doc(reading.usuarioId);

    await db.runTransaction(async (transaction) => {
      const [freshReading, chapter, user] = await Promise.all([
        transaction.get(readingRef),
        transaction.get(chapterRef),
        transaction.get(userRef),
      ]);
      if (!freshReading.exists || !chapter.exists || !user.exists) return;
      if (freshReading.data().contadorProcesado === true) return;
      if (chapter.data().obraId !== reading.obraId) return;

      transaction.update(userRef, {
        capitulosLeidos: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(readingRef, {
        contadorProcesado: true,
        contadorProcesadoEn: FieldValue.serverTimestamp(),
      });
    });
  },
);

export const onUserPermissionChanged = onDocumentUpdated(
  "usuarios/{uid}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.rol !== after.rol) {
      await db
        .collection("perfilesPublicos")
        .doc(event.params.uid)
        .set({ rol: after.rol }, { merge: true });
    }
    if (
      before.rol === after.rol &&
      before.puedeTraducir === after.puedeTraducir
    )
      return;
    const approved =
      after.rol === "traductor" ||
      after.rol === "admin" ||
      after.puedeTraducir === true;
    await notify({
      userId: event.params.uid,
      type: "permiso_traductor",
      title: approved
        ? "Permiso de traducción aprobado"
        : "Permiso de traducción actualizado",
      message: approved
        ? "Ya podés crear traducciones."
        : "Tu permiso de traducción fue revocado o actualizado.",
      link: "/perfil",
      id: `translator_${event.params.uid}_${Date.now()}`,
    });
  },
);

export const onCollaboratorsChanged = onDocumentUpdated(
  "obras/{workId}",
  async (event) => {
    const before = event.data.before.data().colaboradores || [];
    const after = event.data.after.data();
    const added = (after.colaboradores || []).filter(
      (uid) => !before.includes(uid),
    );
    await Promise.all(
      added.map((uid) =>
        notify({
          userId: uid,
          type: "invitacion_colaborador",
          title: "Invitación como colaborador",
          message: `Ahora podés colaborar en ${after.titulo}.`,
          link: `/obra/${event.params.workId}`,
          id: `collaborator_${event.params.workId}_${uid}`,
        }),
      ),
    );
  },
);

export const onTranslationUpdated = onDocumentUpdated(
  "traducciones/{translationId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.estado === after.estado) return;
    await notify({
      userId: after.traductorPrincipalId,
      type: "traduccion_estado",
      title: "Estado de traducción actualizado",
      message: `Tu traducción en ${after.idioma} ahora está ${after.estado}.`,
      link: `/obra/${after.obraId}`,
      id: `translation_${event.params.translationId}_${after.estado}`,
    });
  },
);

async function deleteByField(collectionName, field, value) {
  while (true) {
    const snapshot = await db
      .collection(collectionName)
      .where(field, "==", value)
      .limit(400)
      .get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
}

export const cascadeDeletedWork = onDocumentDeleted(
  "obras/{workId}",
  async (event) => {
    const workId = event.params.workId;
    const translations = await db
      .collection("traducciones")
      .where("obraId", "==", workId)
      .get();
    await Promise.all(translations.docs.map((item) => item.ref.delete()));
    await Promise.all([
      deleteByField("capitulos", "obraId", workId),
      deleteByField("comentarios", "obraId", workId),
      deleteByField("seguimientos", "obraId", workId),
      deleteByField("progresoLectura", "obraId", workId),
      deleteByField("likes", "obraId", workId),
    ]);
  },
);
