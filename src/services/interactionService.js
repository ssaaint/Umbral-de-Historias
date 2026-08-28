import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const entityId = (type, contentId, uid) => `${type}_${contentId}_${uid}`;

export async function getLiked(type, contentId, userId) {
  if (!userId) return false;
  const snapshot = await getDoc(
    doc(db, "likes", entityId(type, contentId, userId)),
  );
  return snapshot.exists();
}

export async function toggleLike({ type, contentId, obraId, userId }) {
  const likeRef = doc(db, "likes", entityId(type, contentId, userId));
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(likeRef);
    if (existing.exists()) {
      transaction.delete(likeRef);
      return false;
    }

    transaction.set(likeRef, {
      tipoContenido: type,
      contenidoId: contentId,
      obraId,
      usuarioId: userId,
      fecha: serverTimestamp(),
    });
    return true;
  });
}

export async function getFollowing(workId, userId) {
  if (!userId) return false;
  const snapshot = await getDoc(
    doc(db, "seguimientos", followId(userId, workId)),
  );
  return snapshot.exists();
}

const followId = (userId, workId) => `${userId}_${workId}`;
const authorFollowId = (userId, authorId) => `${userId}_${authorId}`;

export async function toggleFollow({ workId, userId, latestChapter }) {
  const followRef = doc(db, "seguimientos", followId(userId, workId));
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(followRef);
    if (existing.exists()) {
      transaction.delete(followRef);
      return false;
    }

    transaction.set(followRef, {
      usuarioId: userId,
      obraId: workId,
      fechaSeguimiento: serverTimestamp(),
      ultimoCapituloVisto: "",
      ultimoCapituloDisponible: latestChapter?.id || "",
      ultimoDisponibleNumero: latestChapter?.numero || 0,
    });
    return true;
  });
}

export async function getFollowingAuthor(authorId, userId) {
  if (!userId || !authorId || userId === authorId) return false;
  const snapshot = await getDoc(
    doc(db, "seguimientosAutores", authorFollowId(userId, authorId)),
  );
  return snapshot.exists();
}

export async function toggleAuthorFollow({ authorId, userId }) {
  if (!userId || !authorId || userId === authorId) {
    throw new Error("No podés seguir tu propio perfil.");
  }

  const followRef = doc(
    db,
    "seguimientosAutores",
    authorFollowId(userId, authorId),
  );
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(followRef);
    if (existing.exists()) {
      transaction.delete(followRef);
      return false;
    }

    transaction.set(followRef, {
      usuarioId: userId,
      autorId: authorId,
      fechaSeguimiento: serverTimestamp(),
    });
    return true;
  });
}

export async function recordChapterRead({
  userId,
  work,
  chapter,
  translationId,
}) {
  if (!userId || !work?.id || !chapter?.id) return false;

  const readRef = doc(db, "lecturasCapitulos", `${userId}_${chapter.id}`);
  const existing = await getDoc(readRef);
  if (existing.exists()) return false;

  await setDoc(readRef, {
    usuarioId: userId,
    obraId: work.id,
    capituloId: chapter.id,
    traduccionId: translationId || "",
    fechaPrimeraLectura: serverTimestamp(),
  });
  return true;
}

export async function saveReadingProgress({
  userId,
  work,
  chapter,
  latestChapter,
  translationId,
}) {
  if (!userId || !work?.id || !chapter?.id) return;
  const progressRef = doc(db, "progresoLectura", `${userId}_${work.id}`);

  await setDoc(progressRef, {
    usuarioId: userId,
    obraId: work.id,
    capituloId: chapter.id,
    numeroCapitulo: chapter.numero,
    tituloCapitulo: chapter.titulo,
    traduccionId: translationId || "",
    fechaLectura: serverTimestamp(),
    ultimoDisponible: latestChapter?.id || chapter.id,
    ultimoDisponibleNumero: latestChapter?.numero || chapter.numero,
    ultimoDisponibleTitulo: latestChapter?.titulo || chapter.titulo,
  });

  await recordChapterRead({ userId, work, chapter, translationId });

  const followRef = doc(db, "seguimientos", `${userId}_${work.id}`);
  const followed = await getDoc(followRef);
  if (followed.exists()) {
    await setDoc(
      followRef,
      {
        ultimoCapituloVisto: chapter.id,
        ultimoCapituloDisponible: latestChapter?.id || chapter.id,
        ultimoDisponibleNumero: latestChapter?.numero || chapter.numero,
      },
      { merge: true },
    );
  }
}

export async function reportContent({
  userId,
  tipoContenido,
  contenidoId,
  obraId,
  motivo,
}) {
  await setDoc(
    doc(db, "reportes", `${userId}_${tipoContenido}_${contenidoId}`),
    {
      usuarioId: userId,
      tipoContenido,
      contenidoId,
      obraId,
      motivo,
      estado: "pendiente",
      fecha: serverTimestamp(),
    },
  );
}
