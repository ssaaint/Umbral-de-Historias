import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import StoryCard from "../components/StoryCard";
import FollowAuthorButton from "../components/FollowAuthorButton";
import { formatDate } from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { createAccountProfile } from "../services/accountService";
import { getUsernameError, normalizeUsername } from "../utils/username";
import { chapterRoute, getWork } from "../services/workService";

export default function Perfil() {
  const { uid } = useParams();
  const { user, profile, loading } = useAuth();
  const own = !uid || uid === user?.uid;
  const targetUid = own ? user?.uid : uid;
  const [publicProfile, setPublicProfile] = useState(null);
  const [works, setWorks] = useState([]);
  const [chapterCount, setChapterCount] = useState(0);
  const [followed, setFollowed] = useState([]);
  const [recent, setRecent] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    username: "",
    bio: "",
    fotoUrl: "",
    mostrarSeguidasPublicas: false,
  });
  useEffect(() => {
    if (!targetUid) return;
    (async () => {
      try {
        const [profileSnap, workSnap, chapterSnap] = await Promise.all([
          getDoc(doc(db, "perfilesPublicos", targetUid)),
          getDocs(
            query(collection(db, "obras"), where("autorId", "==", targetUid)),
          ),
          getDocs(
            query(
              collection(db, "capitulos"),
              where("autorId", "==", targetUid),
            ),
          ),
        ]);
        const visibleProfile = own
          ? { ...(profile || {}), ...(profileSnap.data() || {}) }
          : profileSnap.exists()
            ? profileSnap.data()
            : null;
        setPublicProfile(visibleProfile);
        setForm({
          nombre: visibleProfile?.nombre || "",
          username: visibleProfile?.username || "",
          bio: visibleProfile?.bio || "",
          fotoUrl: visibleProfile?.fotoUrl || "",
          mostrarSeguidasPublicas: Boolean(
            visibleProfile?.mostrarSeguidasPublicas,
          ),
        });
        setWorks(
          workSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
        );
        setChapterCount(chapterSnap.size);
        const canSeeFollows = own || visibleProfile?.mostrarSeguidasPublicas;
        if (canSeeFollows) {
          const followSnap = await getDocs(
            query(
              collection(db, "seguimientos"),
              where("usuarioId", "==", targetUid),
            ),
          );
          const worksList = await Promise.all(
            followSnap.docs.map(async (item) => {
              const data = item.data();
              const work = await getWork(data.obraId);
              return work ? { work, data } : null;
            }),
          );
          setFollowed(worksList.filter(Boolean));
        } else setFollowed([]);
        if (own) {
          const readingSnap = await getDocs(
            query(
              collection(db, "progresoLectura"),
              where("usuarioId", "==", targetUid),
            ),
          );
          const readingList = await Promise.all(
            readingSnap.docs.map(async (item) => {
              const data = item.data();
              const work = await getWork(data.obraId);
              return work ? { work, data } : null;
            }),
          );
          setRecent(
            readingList
              .filter(Boolean)
              .sort(
                (a, b) =>
                  (b.data.fechaLectura?.toMillis?.() || 0) -
                  (a.data.fechaLectura?.toMillis?.() || 0),
              ),
          );
        } else setRecent([]);
      } catch (error) {
        console.error("No se pudo cargar el perfil:", error);
      }
    })();
  }, [own, profile, targetUid]);
  const save = async () => {
    if (!user) return;
    const name = form.nombre.trim();
    const username = normalizeUsername(form.username);
    if (
      !name ||
      name.length > 60 ||
      form.bio.length > 600 ||
      form.fotoUrl.length > 2048
    )
      return alert("Revisá los límites del perfil.");
    const needsUsername = !profile?.usernameNormalizado;
    if (needsUsername) {
      const usernameError = getUsernameError(username);
      if (usernameError) return alert(usernameError);
    }
    try {
      if (needsUsername) {
        await createAccountProfile({ user, username, nombre: name });
      }
      const batch = writeBatch(db);
      const update = {
        nombre: name,
        bio: form.bio.trim(),
        fotoUrl: form.fotoUrl.trim(),
        mostrarSeguidasPublicas: form.mostrarSeguidasPublicas,
        updatedAt: serverTimestamp(),
      };
      batch.update(doc(db, "usuarios", user.uid), update);
      batch.update(doc(db, "perfilesPublicos", user.uid), update);
      await batch.commit();
      setEditing(false);
    } catch (error) {
      console.error("No se pudo guardar el perfil:", error);
      alert(getFriendlyFirebaseError(error, "perfil"));
    }
  };
  const stats = useMemo(
    () => ({
      works: works.length,
      chapters: chapterCount,
      views: works.reduce((total, work) => total + Number(work.vistas || 0), 0),
      likes: works.reduce((total, work) => total + Number(work.likes || 0), 0),
    }),
    [chapterCount, works],
  );
  if (loading && own) return <p className="page">Cargando perfil…</p>;
  if (!targetUid || (!own && !publicProfile))
    return (
      <main className="page">
        <h2>Perfil no encontrado.</h2>
      </main>
    );
  const shown = own
    ? { ...publicProfile, rol: profile?.rol || publicProfile?.rol }
    : publicProfile;
  const avatarUrl = editing ? form.fotoUrl : shown?.fotoUrl;
  return (
    <main className="page page-profile">
      <section className="profile-hero">
        <div className="profile-avatar-large">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" />
          ) : (
            <span>{(shown?.nombre || "U").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="profile-main">
          {own && editing ? (
            <>
              <p className="section-kicker">Editar perfil</p>
              <input
                className="form-field"
                maxLength="60"
                value={form.nombre}
                placeholder="Nombre"
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
              />
              {(!profile?.usernameNormalizado || form.username) && (
                <label className="filter-field">
                  <span>Nombre de usuario</span>
                  <input
                    className="form-field"
                    maxLength="20"
                    value={form.username}
                    disabled={Boolean(profile?.usernameNormalizado)}
                    placeholder="usuario_unico"
                    onChange={(event) =>
                      setForm({ ...form, username: event.target.value })
                    }
                  />
                  {!profile?.usernameNormalizado && (
                    <small>Este identificador se elige una sola vez.</small>
                  )}
                </label>
              )}
              <textarea
                className="form-field full-width"
                rows={4}
                maxLength="600"
                value={form.bio}
                placeholder="Biografía"
                onChange={(event) =>
                  setForm({ ...form, bio: event.target.value })
                }
              />
              <input
                className="form-field"
                maxLength="2048"
                value={form.fotoUrl}
                placeholder="URL de foto"
                onChange={(event) =>
                  setForm({ ...form, fotoUrl: event.target.value })
                }
              />
              <label className="form-check">
                <input
                  type="checkbox"
                  checked={form.mostrarSeguidasPublicas}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      mostrarSeguidasPublicas: event.target.checked,
                    })
                  }
                />{" "}
                Mostrar las obras que sigo en mi perfil público
              </label>
              <div className="profile-actions">
                <button type="button" onClick={save}>
                  Guardar perfil
                </button>
                <button
                  type="button"
                  className="btn-filter-reset"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="section-kicker">
                {own ? "Mi perfil" : "Perfil público"}
              </p>
              <div className="profile-title-row">
                <h1>{shown?.nombre || "Usuario"}</h1>
                {shown?.rol === "admin" && (
                  <span className="admin-badge">Administrador</span>
                )}
                {shown?.rol === "moderador" && (
                  <span className="story-pill">Moderador</span>
                )}
                {shown?.rol === "traductor" && (
                  <span className="story-pill">Traductor</span>
                )}
              </div>
              {shown?.username && (
                <p className="profile-username">@{shown.username}</p>
              )}
              {own && <p className="profile-email">{user.email}</p>}
              <p className="profile-bio">
                {shown?.bio || "Todavía no hay biografía."}
              </p>
              {!own && (
                <FollowAuthorButton
                  authorId={targetUid}
                  onChange={(amount) =>
                    setPublicProfile((current) =>
                      current
                        ? {
                            ...current,
                            seguidoresCount: Math.max(
                              0,
                              Number(current.seguidoresCount || 0) + amount,
                            ),
                          }
                        : current,
                    )
                  }
                />
              )}
              {own && (
                <button type="button" onClick={() => setEditing(true)}>
                  Editar perfil
                </button>
              )}
            </>
          )}
        </div>
      </section>
      <section className="profile-stats-grid">
        <span>
          <strong>{stats.works}</strong>obras creadas
        </span>
        <span>
          <strong>{stats.chapters}</strong>capítulos publicados
        </span>
        <span>
          <strong>{stats.views}</strong>vistas acumuladas
        </span>
        <span>
          <strong>{stats.likes}</strong>likes recibidos
        </span>
        <span>
          <strong>{Number(shown?.seguidoresCount || 0)}</strong>seguidores
        </span>
        <span>
          <strong>{Number(shown?.siguiendoCount || 0)}</strong>siguiendo
        </span>
      </section>
      {shown?.fechaRegistro && (
        <p className="profile-joined">
          En Umbral desde {formatDate(shown.fechaRegistro)}
        </p>
      )}
      <ProfileSection
        title="Obras creadas"
        description="Publicaciones de esta persona"
        empty="Todavía no hay obras publicadas."
      >
        {works.map((work) => (
          <StoryCard key={work.id} historia={work} compact />
        ))}
      </ProfileSection>
      {own && (
        <>
          <ProfileSection
            title="Continuar leyendo"
            description="Obras con capítulos pendientes"
            empty="No tenés lecturas pendientes."
          >
            {recent
              .filter(
                (item) =>
                  Number(item.data.numeroCapitulo || 0) <
                  Number(item.data.ultimoDisponibleNumero || 0),
              )
              .map((item) => (
                <ReadingItem key={item.work.id} item={item} />
              ))}
          </ProfileSection>
          <ProfileSection
            title="Lecturas recientes"
            description="Tu actividad más reciente"
            empty="Todavía no registraste lecturas."
          >
            {recent.map((item) => (
              <ReadingItem
                key={`${item.work.id}-${item.data.capituloId}`}
                item={item}
              />
            ))}
          </ProfileSection>
        </>
      )}{" "}
      {(own || shown?.mostrarSeguidasPublicas) && (
        <ProfileSection
          title={own ? "Mis historias" : "Obras que sigue"}
          description={own ? "Tu biblioteca personal" : "Seguimientos públicos"}
          empty="No hay obras seguidas para mostrar."
        >
          {followed.map((item) => (
            <article className="followed-story-item" key={item.work.id}>
              <div className="followed-story-main">
                <Link
                  className="followed-story-title"
                  to={`/obra/${item.work.id}`}
                >
                  {item.work.titulo}
                </Link>
                <p className="followed-story-description">
                  Seguida desde {formatDate(item.data.fechaSeguimiento)}
                </p>
              </div>
              <Link
                className="btn-link btn-link-primary"
                to={`/obra/${item.work.id}`}
              >
                Ver obra
              </Link>
            </article>
          ))}
        </ProfileSection>
      )}
    </main>
  );
}
function ReadingItem({ item }) {
  return (
    <article className="followed-story-item">
      <div className="followed-story-main">
        <div>
          <Link className="followed-story-title" to={`/obra/${item.work.id}`}>
            {item.work.titulo}
          </Link>
          <p className="followed-story-description">
            Capítulo {item.data.numeroCapitulo}: {item.data.tituloCapitulo}
          </p>
        </div>
        <Link
          className="btn-link btn-link-primary"
          to={chapterRoute(
            item.work.id,
            item.data.capituloId,
            item.data.traduccionId,
          )}
        >
          Continuar
        </Link>
      </div>
    </article>
  );
}
function ProfileSection({ title, description, empty, children }) {
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : [children].filter(Boolean);
  return (
    <section className="profile-section">
      <div className="section-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {items.length ? (
        <div className="compact-story-list">{items}</div>
      ) : (
        <p className="empty-state">{empty}</p>
      )}
    </section>
  );
}
