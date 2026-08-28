import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { USER_ROLES } from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [works, setWorks] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    if (!isAdmin) return;
    try {
      const [
        usersSnap,
        worksSnap,
        translationsSnap,
        commentsSnap,
        reportsSnap,
      ] = await Promise.all([
        getDocs(
          query(
            collection(db, "usuarios"),
            orderBy("createdAt", "desc"),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "obras"),
            orderBy("fechaActualizacion", "desc"),
            limit(50),
          ),
        ),
        getDocs(
          query(
            collection(db, "traducciones"),
            orderBy("fechaActualizacion", "desc"),
            limit(50),
          ),
        ),
        getDocs(
          query(
            collection(db, "comentarios"),
            orderBy("fecha", "desc"),
            limit(50),
          ),
        ),
        getDocs(
          query(
            collection(db, "reportes"),
            orderBy("fecha", "desc"),
            limit(50),
          ),
        ),
      ]);
      setUsers(usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setWorks(worksSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setTranslations(
        translationsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
      );
      setComments(
        commentsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
      );
      setReports(
        reportsSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
      );
    } catch (error) {
      console.error("No se pudo cargar la administración:", error);
    }
  };
  useEffect(() => {
    load();
  }, [isAdmin]);
  const updateUser = async (target, field, value) => {
    try {
      setBusy(true);
      const privateRef = doc(db, "usuarios", target.id);
      const update = { [field]: value, updatedAt: serverTimestamp() };
      await updateDoc(privateRef, update);
      await load();
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  };
  const updateTranslation = async (translation, estado) => {
    try {
      await updateDoc(doc(db, "traducciones", translation.id), {
        estado,
        fechaActualizacion: serverTimestamp(),
      });
      await load();
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  const remove = async (collectionName, id) => {
    if (!window.confirm("¿Eliminar este contenido?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      await load();
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  const closeReport = async (report) => {
    try {
      await updateDoc(doc(db, "reportes", report.id), {
        estado: "revisado",
        revisadoPor: user.uid,
        revisadoEn: serverTimestamp(),
      });
      await load();
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  if (loading) return <p className="page">Comprobando permisos…</p>;
  if (!user || !isAdmin)
    return (
      <main className="page">
        <h2>No tenés acceso a administración.</h2>
      </main>
    );
  return (
    <main className="page page-explore">
      <section className="explore-header">
        <div>
          <p className="section-kicker">Administración</p>
          <h1>Moderación y permisos</h1>
          <p>
            {users.length} usuarios · {works.length} obras ·{" "}
            {reports.filter((report) => report.estado === "pendiente").length}{" "}
            reportes pendientes
          </p>
        </div>
      </section>
      <AdminSection title="Usuarios">
        <div className="translated-chapter-list">
          {users.map((target) => (
            <article className="translated-chapter-row" key={target.id}>
              <div>
                <strong>{target.nombre || target.email || target.id}</strong>
                <span>{target.email}</span>
              </div>
              <select
                disabled={busy || target.id === user.uid}
                value={target.rol || "usuario"}
                onChange={(event) =>
                  updateUser(target, "rol", event.target.value)
                }
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <label className="form-check">
                <input
                  disabled={busy}
                  type="checkbox"
                  checked={Boolean(target.puedeTraducir)}
                  onChange={(event) =>
                    updateUser(target, "puedeTraducir", event.target.checked)
                  }
                />{" "}
                Puede traducir
              </label>
              <label className="form-check">
                <input
                  disabled={busy || target.rol === "admin"}
                  type="checkbox"
                  checked={Boolean(target.traduccionBloqueada)}
                  onChange={(event) =>
                    updateUser(
                      target,
                      "traduccionBloqueada",
                      event.target.checked,
                    )
                  }
                />{" "}
                Bloquear traducciones
              </label>
            </article>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Obras recientes">
        <div className="translated-chapter-list">
          {works.map((work) => (
            <article className="translated-chapter-row" key={work.id}>
              <Link to={`/obra/${work.id}`}>
                <strong>{work.titulo}</strong>
                <span>{work.autorNombre}</span>
              </Link>
              <Link
                className="btn-link btn-link-ghost"
                to={`/obra/${work.id}/editar`}
              >
                Editar
              </Link>
              <button
                className="btn-danger-soft"
                onClick={() => remove("obras", work.id)}
              >
                Eliminar
              </button>
            </article>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Traducciones">
        <div className="translated-chapter-list">
          {translations.map((translation) => (
            <article className="translated-chapter-row" key={translation.id}>
              <Link to={`/obra/${translation.obraId}`}>
                <strong>{translation.idioma}</strong>
                <span>{translation.traductorPrincipalNombre}</span>
              </Link>
              <select
                value={translation.estado}
                onChange={(event) =>
                  updateTranslation(translation, event.target.value)
                }
              >
                <option value="publicada">Publicada</option>
                <option value="pausada">Pausada</option>
                <option value="rechazada">Rechazada</option>
              </select>
              <button
                className="btn-danger-soft"
                onClick={() => remove("traducciones", translation.id)}
              >
                Eliminar
              </button>
            </article>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Comentarios">
        <div className="translated-chapter-list">
          {comments.map((comment) => (
            <article className="translated-chapter-row" key={comment.id}>
              <div>
                <strong>{comment.autorNombre}</strong>
                <span>{comment.contenido}</span>
              </div>
              <button
                className="btn-danger-soft"
                onClick={() => remove("comentarios", comment.id)}
              >
                Eliminar
              </button>
            </article>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Reportes">
        <div className="translated-chapter-list">
          {reports.map((report) => (
            <article className="translated-chapter-row" key={report.id}>
              <div>
                <strong>{report.tipoContenido}</strong>
                <span>{report.motivo}</span>
              </div>
              <span>{report.estado}</span>
              {report.estado === "pendiente" && (
                <button onClick={() => closeReport(report)}>
                  Marcar revisado
                </button>
              )}
            </article>
          ))}
        </div>
      </AdminSection>
    </main>
  );
}
function AdminSection({ title, children }) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
