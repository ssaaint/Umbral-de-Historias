import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  collection,
  serverTimestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import ChapterBlocksEditor from "../components/ChapterBlocksEditor";
import {
  blockText,
  canTranslate,
  cleanText,
  DISCORD_URL,
  remainingChaptersForTranslation,
  TRANSLATOR_REQUIREMENTS,
  validateBlocks,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { getWork } from "../services/workService";

export default function SubirTraduccionObra() {
  const { obraId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [language, setLanguage] = useState("");
  const [title, setTitle] = useState("Capítulo 1");
  const [blocks, setBlocks] = useState([{ tipo: "texto", contenido: "" }]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getWork(obraId).then(setWork).catch(console.error);
  }, [obraId]);
  const save = async () => {
    const contentError = validateBlocks(blocks);
    if (!canTranslate(profile))
      return alert(
        `Todavía no cumplís el requisito de ${TRANSLATOR_REQUIREMENTS.minChaptersRead} capítulos leídos. Podés solicitar orientación en Discord.`,
      );
    if (!profile?.usernameNormalizado)
      return alert("Primero elegí tu nombre de usuario desde tu perfil.");
    if (!cleanText(language) || !cleanText(title) || contentError)
      return alert(contentError || "Completá idioma y capítulo inicial.");
    try {
      setSaving(true);
      const translationRef = doc(collection(db, "traducciones"));
      const chapterRef = doc(collection(db, "capitulos"));
      const batch = writeBatch(db);
      batch.set(translationRef, {
        obraId,
        idioma: cleanText(language),
        traductorPrincipalId: user.uid,
        traductorPrincipalNombre:
          profile?.nombre || user.email?.split("@")[0] || "Traductor",
        traductorPrincipalUsername: profile?.username || "",
        traductores: [user.uid],
        estado: "publicada",
        likes: 0,
        comentariosCount: 0,
        capitulosCount: 0,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
      });
      batch.set(chapterRef, {
        obraId,
        traduccionId: translationRef.id,
        titulo: cleanText(title),
        numero: 1,
        bloques: blocks,
        contenidoTexto: blockText(blocks).slice(0, 50000),
        autorId: user.uid,
        autorNombre:
          profile?.nombre || user.email?.split("@")[0] || "Traductor",
        autorUsername: profile?.username || "",
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
        vistas: 0,
        likes: 0,
        comentariosCount: 0,
      });
      await batch.commit();
      navigate(`/obra/${obraId}`);
    } catch (error) {
      console.error("No se pudo crear la traducción:", error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setSaving(false);
    }
  };
  if (!work) return <p className="page">Cargando obra…</p>;
  if (!user || !canTranslate(profile) || work.tipo !== "externa")
    return (
      <main className="page page-form">
        <h2>Traducciones de obras externas</h2>
        <p>
          Umbral de Historias administra las fichas de obras externas. Las obras
          originales de usuarios no se convierten automáticamente en
          traducibles.
        </p>
        {user && profile?.traduccionBloqueada !== true && (
          <p>
            Te faltan {remainingChaptersForTranslation(profile)} de los{" "}
            {TRANSLATOR_REQUIREMENTS.minChaptersRead} capítulos requeridos,
            salvo que administración te otorgue el permiso manualmente.
          </p>
        )}
        <a href={DISCORD_URL} target="_blank" rel="noreferrer">
          Consultar en Discord
        </a>
      </main>
    );
  return (
    <main className="page page-form">
      <p className="section-kicker">{work.titulo}</p>
      <h2>Nueva traducción</h2>
      <p className="permission-note">
        La traducción queda asociada a esta obra externa y conserva el idioma
        original: {work.idiomaOriginal}.
      </p>
      <input
        className="form-field"
        value={language}
        maxLength="60"
        placeholder="Idioma de la traducción"
        onChange={(event) => setLanguage(event.target.value)}
      />
      <input
        className="form-field"
        value={title}
        maxLength="180"
        placeholder="Título del capítulo inicial"
        onChange={(event) => setTitle(event.target.value)}
      />
      <ChapterBlocksEditor blocks={blocks} onChange={setBlocks} />
      <button type="button" disabled={saving} onClick={save}>
        {saving ? "Creando…" : "Publicar traducción"}
      </button>
    </main>
  );
}
