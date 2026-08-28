import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import ChapterBlocksEditor from "../components/ChapterBlocksEditor";
import {
  blockText,
  canWriteChapter,
  cleanText,
  validateBlocks,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { getWork } from "../services/workService";

export default function EditarCapitulo() {
  const { capituloId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [work, setWork] = useState(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const snapshot = await getDoc(doc(db, "capitulos", capituloId));
        if (!snapshot.exists()) return;
        const loaded = { id: snapshot.id, ...snapshot.data() };
        setChapter(loaded);
        setWork(await getWork(loaded.obraId));
        setTitle(loaded.titulo || "");
        setBlocks(loaded.bloques || []);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [capituloId]);
  const allowed = canWriteChapter(chapter, work, user, profile);
  const save = async () => {
    const blockError = validateBlocks(blocks);
    if (!cleanText(title) || blockError)
      return alert(blockError || "El título es obligatorio.");
    try {
      setSaving(true);
      await updateDoc(doc(db, "capitulos", capituloId), {
        titulo: cleanText(title),
        bloques: blocks,
        contenidoTexto: blockText(blocks).slice(0, 50000),
        fechaActualizacion: serverTimestamp(),
      });
      navigate(
        `/obra/${chapter.obraId}/capitulo/${chapter.id}${chapter.traduccionId ? `?traduccion=${chapter.traduccionId}` : ""}`,
      );
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!window.confirm("¿Eliminar este capítulo?")) return;
    try {
      await deleteDoc(doc(db, "capitulos", capituloId));
      navigate(`/obra/${chapter.obraId}`);
    } catch (error) {
      console.error(error);
      alert(getFriendlyFirebaseError(error));
    }
  };
  if (!chapter || !work) return <p className="page">Cargando capítulo…</p>;
  if (!allowed)
    return <p className="page">No tenés permisos para editar este capítulo.</p>;
  return (
    <main className="page page-form">
      <Link className="text-link" to={`/obra/${work.id}`}>
        Volver a la obra
      </Link>
      <p className="section-kicker">{work.titulo}</p>
      <h2>Editar capítulo</h2>
      <input
        className="form-field"
        value={title}
        maxLength="180"
        onChange={(event) => setTitle(event.target.value)}
      />
      <ChapterBlocksEditor blocks={blocks} onChange={setBlocks} />
      <div className="form-actions">
        <button type="button" disabled={saving} onClick={save}>
          Guardar cambios
        </button>
        <button
          type="button"
          className="btn-danger"
          disabled={saving}
          onClick={remove}
        >
          Eliminar capítulo
        </button>
      </div>
    </main>
  );
}
