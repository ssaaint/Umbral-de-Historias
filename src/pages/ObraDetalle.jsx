import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import CommentsSection from "../components/CommentsSection";
import FollowButton from "../components/FollowButton";
import LikeButton from "../components/LikeButton";
import {
  canManageWork,
  canTranslate,
  DISCORD_URL,
  formatDate,
  getWorkTypeLabel,
  isAdmin,
  remainingChaptersForTranslation,
  TRANSLATOR_REQUIREMENTS,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import {
  chapterRoute,
  getTranslations,
  getWork,
  getWorkChapters,
} from "../services/workService";

export default function ObraDetalle() {
  const { obraId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [originalChapters, setOriginalChapters] = useState([]);
  const [displayChapters, setDisplayChapters] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [selectedTranslation, setSelectedTranslation] = useState("");
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const load = async () => {
    if (!obraId) return;
    try {
      setLoading(true);
      setLoadError("");
      const loadedWork = await getWork(obraId);
      setWork(loadedWork);

      if (!loadedWork) {
        setOriginalChapters([]);
        setDisplayChapters([]);
        setTranslations([]);
        return;
      }

      const [chaptersResult, translationsResult, countResult] =
        await Promise.allSettled([
          getWorkChapters(obraId),
          getTranslations(obraId),
          getCountFromServer(
            query(
              collection(db, "comentarios"),
              where("contenidoId", "==", obraId),
            ),
          ),
        ]);
      const chapters =
        chaptersResult.status === "fulfilled" ? chaptersResult.value : [];
      const loadedTranslations =
        translationsResult.status === "fulfilled"
          ? translationsResult.value
          : [];
      setOriginalChapters(chapters);
      setDisplayChapters(chapters);
      setTranslations(loadedTranslations);
      setCommentCount(
        countResult.status === "fulfilled"
          ? countResult.value.data().count
          : Number(loadedWork.comentariosCount || 0),
      );

      if (
        chaptersResult.status === "rejected" ||
        translationsResult.status === "rejected" ||
        countResult.status === "rejected"
      ) {
        console.error("No se pudo cargar una sección de la obra:", {
          chapters:
            chaptersResult.status === "rejected" ? chaptersResult.reason : null,
          translations:
            translationsResult.status === "rejected"
              ? translationsResult.reason
              : null,
          comments:
            countResult.status === "rejected" ? countResult.reason : null,
        });
        setLoadError(
          "No pudimos cargar todos los datos de esta obra. Podés intentar nuevamente.",
        );
      }
    } catch (error) {
      console.error("No se pudo cargar la obra:", error);
      setLoadError("No pudimos cargar esta obra. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [obraId]);
  const selected = useMemo(
    () =>
      translations.find(
        (translation) => translation.id === selectedTranslation,
      ) || null,
    [selectedTranslation, translations],
  );
  useEffect(() => {
    if (!selected) {
      setDisplayChapters(originalChapters);
      return;
    }
    getWorkChapters(obraId, selected.id)
      .then(setDisplayChapters)
      .catch(console.error);
  }, [obraId, originalChapters, selected]);
  const mayManage = canManageWork(work, user, profile);
  const mayAddChapter = Boolean(
    user &&
      (isAdmin(profile) ||
        work?.autorId === user.uid ||
        work?.colaboradores?.includes(user.uid)) &&
      !selected,
  );
  const mayAddTranslationChapter = Boolean(
    selected &&
      user &&
      (isAdmin(profile) || selected.traductores?.includes(user.uid)),
  );
  const removeWork = async () => {
    if (!window.confirm("¿Eliminar esta obra y su contenido?")) return;
    try {
      await deleteDoc(doc(db, "obras", obraId));
      navigate("/explorar");
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  const moderateTranslation = async (translation, estado) => {
    try {
      await updateDoc(doc(db, "traducciones", translation.id), { estado });
      await load();
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  if (loading) return <p className="page">Cargando obra…</p>;
  if (!work)
    return (
      <main className="page page-empty-state">
        <h2>
          {loadError
            ? "No pudimos cargar esta obra."
            : "Esta obra ya no existe."}
        </h2>
        {loadError && <p>{loadError}</p>}
        <Link to="/explorar">Volver a explorar</Link>
      </main>
    );
  const languages = [
    { id: "", label: `Original · ${work.idiomaOriginal || "sin idioma"}` },
    ...translations
      .filter((item) => item.estado !== "rechazada")
      .map((item) => ({ id: item.id, label: item.idioma })),
  ];
  return (
    <main className="page page-obra-detail">
      <section className="obra-hero">
        <div className="obra-cover">
          {work.portadaUrl ? (
            <img src={work.portadaUrl} alt={`Portada de ${work.titulo}`} />
          ) : (
            <span>{work.titulo.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="obra-hero-main">
          <p className="section-kicker">{getWorkTypeLabel(work.tipo)}</p>
          <h1>{work.titulo}</h1>
          <p className="story-detail-author">
            Por{" "}
            <Link to={`/perfil/${work.autorId}`}>
              {work.autorNombre || "Usuario"}
            </Link>
          </p>
          {work.tipo === "externa" && (
            <p className="story-translation-origin">
              Obra externa · autor original:{" "}
              <strong>{work.autorOriginal}</strong>
              {work.origenUrl && (
                <>
                  {" "}
                  ·{" "}
                  <a href={work.origenUrl} target="_blank" rel="noreferrer">
                    Ver origen
                  </a>
                </>
              )}
            </p>
          )}
          <p className="story-detail-description">{work.descripcion}</p>
          <div className="story-detail-tags">
            {(work.generos || []).map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
            {(work.etiquetas || []).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="hero-actions">
            <LikeButton
              type="obra"
              contentId={work.id}
              obraId={work.id}
              count={work.likes}
            />
            <FollowButton
              workId={work.id}
              latestChapter={originalChapters.at(-1)}
              count={work.seguidoresCount}
            />
            {mayManage && (
              <Link
                className="btn-link btn-link-ghost"
                to={`/obra/${work.id}/editar`}
              >
                Editar
              </Link>
            )}
            {mayManage && (
              <button
                type="button"
                className="btn-danger-soft"
                onClick={removeWork}
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </section>
      {loadError && <p className="permission-note">{loadError}</p>}
      <section className="profile-stats-grid obra-stats-card">
        <span>
          <strong>{work.vistas || 0}</strong>lectores
        </span>
        <span>
          <strong>{work.likes || 0}</strong>likes
        </span>
        <span>
          <strong>{commentCount}</strong>comentarios
        </span>
        <span>
          <strong>{work.seguidoresCount || 0}</strong>seguidores
        </span>
        <span>
          <strong>{work.capitulosCount || originalChapters.length}</strong>
          capítulos
        </span>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <p className="section-kicker">Idiomas</p>
          <h2>Leer en</h2>
        </div>
        <div className="translation-language-select">
          {languages.map((language) => (
            <button
              key={language.id || "original"}
              type="button"
              className={
                selectedTranslation === language.id
                  ? "genre-tile genre-tile-active"
                  : "genre-tile"
              }
              onClick={() => setSelectedTranslation(language.id)}
            >
              {language.label}
            </button>
          ))}
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <p className="section-kicker">
            {selected ? `Traducción de ${selected.idioma}` : "Versión original"}
          </p>
          <h2>Capítulos</h2>
        </div>
        {selected && (
          <LikeButton
            type="traduccion"
            contentId={selected.id}
            obraId={work.id}
            count={selected.likes}
          />
        )}
        {mayAddChapter && (
          <Link
            className="btn-link btn-link-primary"
            to={`/obra/${work.id}/capitulos/nuevo`}
          >
            Nuevo capítulo
          </Link>
        )}
        {mayAddTranslationChapter && (
          <Link
            className="btn-link btn-link-primary"
            to={`/obra/${work.id}/capitulos/nuevo?traduccion=${selected.id}`}
          >
            Nuevo capítulo traducido
          </Link>
        )}
        {displayChapters.length ? (
          <div className="chapter-list">
            {displayChapters.map((chapter) => (
              <Link
                key={chapter.id}
                className="chapter-item"
                to={chapterRoute(work.id, chapter.id, selected?.id || null)}
              >
                <span>Capítulo {chapter.numero}</span>
                <strong>{chapter.titulo}</strong>
                <small>{formatDate(chapter.fechaActualizacion)}</small>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">Aún no hay capítulos en esta versión.</p>
        )}
      </section>
      {work.tipo === "externa" && (
        <section className="home-section">
          <div className="section-heading">
            <p className="section-kicker">Traducciones</p>
            <h2>Colaborar con una traducción</h2>
          </div>
          {user && canTranslate(profile) ? (
            <Link
              className="btn-link btn-link-primary"
              to={`/obra/${work.id}/traducciones/nueva`}
            >
              Crear traducción
            </Link>
          ) : (
            <div className="permission-note translation-info">
              <p>
                Las obras externas traducibles son incorporadas y administradas
                por Umbral de Historias. Si querés solicitar una obra externa,
                pedila en nuestro Discord oficial.
              </p>
              <p>
                Para traducir, necesitás tener el permiso de administración o
                cumplir el requisito actual de aproximadamente{" "}
                {TRANSLATOR_REQUIREMENTS.minChaptersRead} capítulos leídos. Ser
                propietario o colaborador de una obra original no concede ese
                permiso automáticamente.
              </p>
              {user && profile?.traduccionBloqueada !== true && (
                <p>
                  Te faltan {remainingChaptersForTranslation(profile)} capítulos
                  para cumplir el requisito automático. Administración puede
                  otorgar o revocar permisos cuando corresponda.
                </p>
              )}
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">
                Solicitar una obra o consultar en Discord
              </a>
            </div>
          )}
          {translations.length > 0 && (
            <div className="translation-grid">
              {translations.map((translation) => (
                <article className="translation-card" key={translation.id}>
                  <p className="section-kicker">{translation.idioma}</p>
                  <h3>{translation.estado}</h3>
                  <p>
                    Por{" "}
                    <Link to={`/perfil/${translation.traductorPrincipalId}`}>
                      {translation.traductorPrincipalNombre || "Traductor"}
                    </Link>
                  </p>
                  {isAdmin(profile) && (
                    <div className="admin-actions">
                      <button
                        onClick={() =>
                          moderateTranslation(translation, "publicada")
                        }
                      >
                        Publicar
                      </button>
                      <button
                        className="btn-danger-soft"
                        onClick={() =>
                          moderateTranslation(translation, "rechazada")
                        }
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {selected && (
        <CommentsSection
          type="traduccion"
          contentId={selected.id}
          obraId={work.id}
        />
      )}
      <CommentsSection type="obra" contentId={work.id} obraId={work.id} />
    </main>
  );
}
