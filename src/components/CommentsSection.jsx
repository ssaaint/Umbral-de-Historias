import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { formatDate, isAdmin } from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

export default function CommentsSection({ type, contentId, obraId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setLoadError("");
    const unsubscribe = onSnapshot(
      query(
        collection(db, "comentarios"),
        where("contenidoId", "==", contentId),
      ),
      (snapshot) => {
        const sorted = snapshot.docs
          .filter((item) => item.data().tipoContenido === type)
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(
            (a, b) =>
              (a.fecha?.toMillis?.() || 0) - (b.fecha?.toMillis?.() || 0),
          );
        setComments(sorted);
      },
      (error) => {
        console.error("No se pudieron cargar comentarios:", error);
        setLoadError(
          "No pudimos cargar los comentarios. Intentá actualizar la página.",
        );
      },
    );
    return unsubscribe;
  }, [contentId, type]);
  const submit = async () => {
    if (!user) return alert("Necesitás iniciar sesión para comentar.");
    const content = text.trim();
    if (!content || content.length > 2000)
      return alert("El comentario debe tener entre 1 y 2000 caracteres.");
    try {
      setBusy(true);
      await addDoc(collection(db, "comentarios"), {
        tipoContenido: type,
        contenidoId: contentId,
        obraId,
        padreId: replyTo,
        autorId: user.uid,
        autorNombre: profile?.nombre || user.email?.split("@")[0] || "Usuario",
        autorUsername: profile?.username || "",
        autorFoto: profile?.fotoUrl || "",
        contenido: content,
        fecha: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setText("");
      setReplyTo("");
      setFeedback("Comentario publicado.");
    } catch (error) {
      console.error("No se pudo publicar el comentario:", error);
      alert(getFriendlyFirebaseError(error, "comentario"));
    } finally {
      setBusy(false);
    }
  };
  const edit = async (comment) => {
    const content = window
      .prompt("Editar comentario", comment.contenido)
      ?.trim();
    if (!content || content.length > 2000) return;
    try {
      await updateDoc(doc(db, "comentarios", comment.id), {
        contenido: content,
        updatedAt: serverTimestamp(),
      });
      setFeedback("Comentario actualizado.");
    } catch (error) {
      console.error("No se pudo editar el comentario:", error);
      alert(getFriendlyFirebaseError(error, "comentario"));
    }
  };
  const remove = async (comment) => {
    if (!window.confirm("¿Eliminar este comentario?")) return;
    try {
      await deleteDoc(doc(db, "comentarios", comment.id));
      setFeedback("Comentario eliminado.");
    } catch (error) {
      console.error("No se pudo eliminar el comentario:", error);
      alert(getFriendlyFirebaseError(error, "comentario"));
    }
  };
  const grouped = useMemo(
    () => ({
      parents: comments.filter((comment) => !comment.padreId),
      replies: comments.filter((comment) => comment.padreId),
    }),
    [comments],
  );
  return (
    <section className="comments-section">
      <div className="section-heading">
        <p className="section-kicker">Comunidad</p>
        <h2>Comentarios</h2>
      </div>
      {user ? (
        <div className="comment-form">
          {replyTo && (
            <p className="permission-note">
              Respondiendo a un comentario{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => setReplyTo("")}
              >
                Cancelar
              </button>
            </p>
          )}
          <textarea
            className="comment-input"
            rows={4}
            maxLength="2000"
            value={text}
            placeholder="Compartí tu opinión…"
            onChange={(event) => setText(event.target.value)}
          />
          <button type="button" disabled={busy} onClick={submit}>
            {busy ? "Publicando…" : replyTo ? "Responder" : "Comentar"}
          </button>
          {feedback && <p className="form-help">{feedback}</p>}
        </div>
      ) : (
        <p className="empty-state">Iniciá sesión para participar.</p>
      )}
      {loadError && <p className="form-error">{loadError}</p>}
      <div className="comments-list">
        {grouped.parents.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            replies={grouped.replies.filter(
              (reply) => reply.padreId === comment.id,
            )}
            user={user}
            admin={isAdmin(profile)}
            onReply={setReplyTo}
            onEdit={edit}
            onDelete={remove}
          />
        ))}
      </div>
      {comments.length === 0 && (
        <p className="empty-state">Todavía no hay comentarios.</p>
      )}
    </section>
  );
}
function Comment({ comment, replies, user, admin, onReply, onEdit, onDelete }) {
  const editable = user?.uid === comment.autorId;
  const removable = editable || admin;
  return (
    <article className="comment-card obra-comment-card">
      <div className="comment-author-row">
        <div className="story-author-avatar">
          {comment.autorFoto ? (
            <img src={comment.autorFoto} alt="" />
          ) : (
            <span>
              {(comment.autorNombre || "U").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <strong>{comment.autorNombre || "Usuario"}</strong>
          <p className="comment-author">
            {comment.autorUsername ? `@${comment.autorUsername} · ` : ""}
            {formatDate(comment.fecha)}
          </p>
        </div>
      </div>
      <p>{comment.contenido}</p>
      <div className="notification-actions">
        {user && (
          <button type="button" onClick={() => onReply(comment.id)}>
            Responder
          </button>
        )}
        {editable && (
          <button type="button" onClick={() => onEdit(comment)}>
            Editar
          </button>
        )}
        {removable && (
          <button type="button" onClick={() => onDelete(comment)}>
            Eliminar
          </button>
        )}
      </div>
      {replies.length > 0 && (
        <div className="comments-list">
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={[]}
              user={user}
              admin={admin}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
}
