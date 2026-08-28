import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { cleanText, normalizeForSearch } from "../utils/contentModel";
import { createSlug } from "../utils/slugUtils";

export const workRef = (id) => doc(db, "obras", id);

export async function getUniqueSlug(title) {
  const base = createSlug(title) || "obra";
  let candidate = base;
  let suffix = 2;

  while (suffix < 100) {
    const snapshot = await getDocs(
      query(collection(db, "obras"), where("slug", "==", candidate), limit(1)),
    );
    if (snapshot.empty) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function createWork({ values, user, profile }) {
  const slug = await getUniqueSlug(values.titulo);
  const authorName =
    cleanText(profile?.nombre) || user.email?.split("@")[0] || "Usuario";
  const isExternal = values.tipo === "externa";

  return addDoc(collection(db, "obras"), {
    titulo: cleanText(values.titulo),
    tituloBusqueda: normalizeForSearch(values.titulo),
    slug,
    descripcion: cleanText(values.descripcion),
    portadaUrl: cleanText(values.portadaUrl),
    autorId: user.uid,
    autorNombre: authorName,
    autorBusqueda: normalizeForSearch(authorName),
    autorUsername: profile?.username || "",
    autorUsernameNormalizado: profile?.usernameNormalizado || "",
    generos: values.generos,
    etiquetas: values.etiquetas,
    tipo: values.tipo,
    idiomaOriginal: cleanText(values.idiomaOriginal),
    autorOriginal: isExternal ? cleanText(values.autorOriginal) : "",
    origenUrl: isExternal ? cleanText(values.origenUrl) : "",
    estado: values.estado,
    colaboradores: values.colaboradores || [],
    vistas: 0,
    likes: 0,
    comentariosCount: 0,
    seguidoresCount: 0,
    capitulosCount: 0,
    traduccionesCount: 0,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });
}

export async function getWork(id) {
  const snapshot = await getDoc(workRef(id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getWorkChapters(workId, translationId = null) {
  const snapshot = await getDocs(
    query(collection(db, "capitulos"), where("obraId", "==", workId)),
  );
  return snapshot.docs
    .map((chapter) => ({ id: chapter.id, ...chapter.data() }))
    .filter(
      (chapter) => (chapter.traduccionId || null) === (translationId || null),
    )
    .sort((a, b) => Number(a.numero || 0) - Number(b.numero || 0));
}

export async function getTranslations(workId) {
  const snapshot = await getDocs(
    query(collection(db, "traducciones"), where("obraId", "==", workId)),
  );
  return snapshot.docs
    .map((translation) => ({ id: translation.id, ...translation.data() }))
    .sort((a, b) => String(a.idioma || "").localeCompare(b.idioma || ""));
}

export async function getLatestChapter(workId, translationId = null) {
  const chapters = await getWorkChapters(workId, translationId);
  return chapters.at(-1) || null;
}

export function chapterRoute(workId, chapterId, translationId = null) {
  const translationPart = translationId
    ? `?traduccion=${encodeURIComponent(translationId)}`
    : "";
  return `/obra/${workId}/capitulo/${chapterId}${translationPart}`;
}
