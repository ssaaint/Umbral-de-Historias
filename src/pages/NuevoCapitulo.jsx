import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import ChapterBlocksEditor from "../components/ChapterBlocksEditor";
import {
  blockText,
  cleanText,
  isAdmin,
  validateBlocks,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import {
  getTranslations,
  getWork,
  getWorkChapters,
} from "../services/workService";

export default function NuevoCapitulo() {
  const { obraId } = useParams();
  const [searchParams] = useSearchParams();
  const translationId = searchParams.get("traduccion") || "";
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [chapterCount, setChapterCount] = useState(0);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([{ tipo: "texto", contenido: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const [loadedWork, translations, chapters] = await Promise.all([
          getWork(obraId),
          getTranslations(obraId),
          getWorkChapters(obraId, translationId || null),
        ]);
        setWork(loadedWork);
        setTranslation(
          translations.find((item) => item.id === translationId) || null,
        );
        setChapterCount(chapters.length);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [obraId, translationId]);
  const allowed = Boolean(
    user &&
      work &&
      (translationId
        ? isAdmin(profile) || translation?.traductores?.includes(user.uid)
        : isAdmin(profile) ||
          work.autorId === user.uid ||
          work.colaboradores?.includes(user.uid)),
  );
  const save = async () => {
    const cleanTitle = cleanText(title);
    const blockError = validateBlocks(blocks);
    if (!cleanTitle || cleanTitle.length > 180)
      return alert(
        "El título del capítulo es obligatorio y no puede superar 180 caracteres.",
      );
    if (blockError) return alert(blockError);
    if (!allowed)
      return alert("No tenés permisos para publicar este capítulo.");
    if (!profile?.usernameNormalizado)
      return alert("Primero elegí tu nombre de usuario desde tu perfil.");
    try {
      setSaving(true);
      await addDoc(collection(db, "capitulos"), {
        obraId,
        traduccionId: translationId || null,
        titulo: cleanTitle,
        numero: chapterCount + 1,
        bloques: blocks,
        contenidoTexto: blockText(blocks).slice(0, 50000),
        autorId: user.uid,
        autorNombre: profile?.nombre || user.email?.split("@")[0] || "Usuario",
        autorUsername: profile?.username || "",
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        vistas: 0,
        likes: 0,
        comentariosCount: 0,
      });
      navigate(`/obra/${obraId}`);
    } catch (error) {
      console.error("No se pudo crear el capítulo:", error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setSaving(false);
    }
  };
  if (!work) return <p className="page">Cargando capítulo…</p>;
  if (!user || !allowed)
    return (
      <main className="page">
        <h2>No tenés permisos para crear capítulos.</h2>
      </main>
    );
  return (
    <main className="page page-form">
      <p className="section-kicker">
        {translation ? `Traducción · ${translation.idioma}` : work.titulo}
      </p>
      <h2>Nuevo capítulo</h2>
      <input
        className="form-field"
        value={title}
        maxLength="180"
        placeholder="Título del capítulo"
        onChange={(event) => setTitle(event.target.value)}
      />
      <ChapterBlocksEditor blocks={blocks} onChange={setBlocks} />
      <button type="button" disabled={saving} onClick={save}>
        {saving ? "Publicando…" : "Publicar capítulo"}
      </button>
    </main>
  );
}
