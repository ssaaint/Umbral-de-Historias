import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import ChapterBlocks from "../components/ChapterBlocks";
import CommentsSection from "../components/CommentsSection";
import LikeButton from "../components/LikeButton";
import ReadingSettings from "../components/ReadingSettings";
import {
  reportContent,
  saveReadingProgress,
} from "../services/interactionService";
import {
  chapterRoute,
  getWork,
  getWorkChapters,
} from "../services/workService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { canWriteChapter } from "../utils/contentModel";

const defaultStyle = {
  fontSize: 19,
  fontFamily: "serif",
  width: "normal",
  lineHeight: 1.8,
  background: "#fffdf8",
  color: "#242329",
};
export default function ObraCapituloLectura() {
  const { obraId, capituloId } = useParams();
  const [searchParams] = useSearchParams();
  const translationId = searchParams.get("traduccion") || "";
  const { user, profile } = useAuth();
  const [work, setWork] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [settings, setSettings] = useState(defaultStyle);
  const setReaderSettings = useCallback((value) => setSettings(value), []);
  useEffect(() => {
    (async () => {
      try {
        setLoadError("");
        const [workData, chapterSnapshot, chapterList] = await Promise.all([
          getWork(obraId),
          getDoc(doc(db, "capitulos", capituloId)),
          getWorkChapters(obraId, translationId || null),
        ]);
        if (!chapterSnapshot.exists()) {
          setLoadError("Este capítulo ya no existe.");
          return;
        }
        if (!workData) {
          setLoadError("Esta obra ya no existe.");
          return;
        }
        const loadedChapter = {
          id: chapterSnapshot.id,
          ...chapterSnapshot.data(),
        };
        setWork(workData);
        setChapter(loadedChapter);
        setChapters(chapterList);
        if (user && workData)
          await saveReadingProgress({
            userId: user.uid,
            work: workData,
            chapter: loadedChapter,
            latestChapter: chapterList.at(-1),
            translationId,
          });
      } catch (error) {
        console.error("No se pudo cargar el lector:", error);
        setLoadError("No pudimos cargar este capítulo. Intentá nuevamente.");
      }
    })();
  }, [capituloId, obraId, translationId, user]);
  const report = async () => {
    if (!user)
      return alert("Necesitás iniciar sesión para reportar contenido.");
    const motive = window
      .prompt("¿Por qué querés reportar este capítulo?")
      ?.trim();
    if (!motive) return;
    try {
      await reportContent({
        userId: user.uid,
        tipoContenido: "capitulo",
        contenidoId: capituloId,
        obraId,
        motivo: motive.slice(0, 500),
      });
      alert("Gracias. El reporte fue enviado a moderación.");
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  if (!chapter || !work) {
    if (loadError)
      return (
        <main className="page page-empty-state">
          <h2>{loadError}</h2>
          <Link to={`/obra/${obraId}`}>Volver a la obra</Link>
        </main>
      );
    return <p className="page">Cargando lectura…</p>;
  }
  const index = chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const maxWidth =
    settings.width === "narrow" ? 620 : settings.width === "wide" ? 980 : 760;
  const editable = canWriteChapter(chapter, work, user, profile);
  return (
    <main className="page page-reader">
      <Link className="text-link" to={`/obra/${obraId}`}>
        ← Volver a la obra
      </Link>
      <header className="chapter-reader-heading">
        <p className="section-kicker">{work.titulo}</p>
        <h1>
          Capítulo {chapter.numero}: {chapter.titulo}
        </h1>
        <div className="hero-actions">
          <LikeButton
            type="capitulo"
            contentId={chapter.id}
            obraId={obraId}
            count={chapter.likes}
          />
          {editable && (
            <Link
              className="btn-link btn-link-ghost"
              to={`/capitulos/${chapter.id}/editar`}
            >
              Editar
            </Link>
          )}
          <button type="button" className="btn-secondary" onClick={report}>
            Reportar
          </button>
        </div>
      </header>
      <ReadingSettings
        key={user?.uid || "guest"}
        userId={user?.uid}
        onChange={setReaderSettings}
      />
      <article
        className={`reader-surface reader-font-${settings.fontFamily}`}
        style={{
          maxWidth,
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
          background: settings.background,
          color: settings.color,
        }}
      >
        <ChapterBlocks blocks={chapter.bloques || []} />
      </article>
      <nav className="chapter-navigation">
        {previous ? (
          <Link
            className="btn-link btn-link-ghost"
            to={chapterRoute(obraId, previous.id, translationId || null)}
          >
            ← Anterior
          </Link>
        ) : (
          <span className="chapter-nav-disabled">No hay capítulo anterior</span>
        )}
        <Link className="btn-link btn-link-ghost" to={`/obra/${obraId}`}>
          Lista de capítulos
        </Link>
        {next ? (
          <Link
            className="btn-link btn-link-primary"
            to={chapterRoute(obraId, next.id, translationId || null)}
          >
            Siguiente →
          </Link>
        ) : (
          <span className="chapter-nav-disabled">Último capítulo</span>
        )}
      </nav>
      <CommentsSection type="capitulo" contentId={chapter.id} obraId={obraId} />
    </main>
  );
}
