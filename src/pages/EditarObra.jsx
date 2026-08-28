import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import {
  GENRES,
  WORK_STATES,
  canManageWork,
  cleanText,
  isAdmin,
  toTextList,
  toUidList,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { getWork } from "../services/workService";

export default function EditarObra() {
  const { obraId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [work, setWork] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    getWork(obraId)
      .then((loaded) => {
        setWork(loaded);
        setForm(
          loaded && {
            titulo: loaded.titulo || "",
            descripcion: loaded.descripcion || "",
            portadaUrl: loaded.portadaUrl || "",
            generos: loaded.generos || [],
            etiquetas: (loaded.etiquetas || []).join(", "),
            idiomaOriginal: loaded.idiomaOriginal || "",
            estado: loaded.estado || "en_progreso",
            autorOriginal: loaded.autorOriginal || "",
            origenUrl: loaded.origenUrl || "",
            colaboradores: (loaded.colaboradores || []).join("\n"),
          },
        );
      })
      .catch(console.error);
  }, [obraId]);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggleGenre = (genre) =>
    set(
      "generos",
      form.generos.includes(genre)
        ? form.generos.filter((item) => item !== genre)
        : [...form.generos, genre].slice(0, 4),
    );
  const allowed = canManageWork(work, user, profile);
  const save = async () => {
    const title = cleanText(form.titulo);
    if (
      !title ||
      title.length > 120 ||
      cleanText(form.descripcion).length < 20 ||
      !form.generos.length
    )
      return alert("Completá título, descripción y al menos un género.");
    try {
      setSaving(true);
      const data = {
        titulo: title,
        descripcion: cleanText(form.descripcion),
        portadaUrl: cleanText(form.portadaUrl),
        generos: form.generos,
        etiquetas: toTextList(form.etiquetas),
        idiomaOriginal: cleanText(form.idiomaOriginal),
        estado: form.estado,
        autorOriginal:
          work.tipo === "externa" ? cleanText(form.autorOriginal) : "",
        origenUrl: work.tipo === "externa" ? cleanText(form.origenUrl) : "",
        fechaActualizacion: serverTimestamp(),
      };
      if (allowed) data.colaboradores = toUidList(form.colaboradores);
      await updateDoc(doc(db, "obras", obraId), data);
      navigate(`/obra/${obraId}`);
    } catch (error) {
      console.error("No se pudo editar la obra:", error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setSaving(false);
    }
  };
  if (!work || !form) return <p className="page">Cargando obra…</p>;
  if (!allowed)
    return <p className="page">No tenés permisos para editar esta obra.</p>;
  return (
    <main className="page page-form">
      <Link className="text-link" to={`/obra/${obraId}`}>
        Volver a la obra
      </Link>
      <p className="section-kicker">
        {work.tipo === "externa" ? "Obra externa" : "Obra original"}
      </p>
      <h2>Editar obra</h2>
      <input
        className="form-field"
        maxLength="120"
        value={form.titulo}
        onChange={(event) => set("titulo", event.target.value)}
      />
      <textarea
        className="form-field full-width"
        rows={5}
        maxLength="3000"
        value={form.descripcion}
        onChange={(event) => set("descripcion", event.target.value)}
      />
      <input
        className="form-field"
        maxLength="2048"
        value={form.portadaUrl}
        placeholder="URL de portada"
        onChange={(event) => set("portadaUrl", event.target.value)}
      />
      <div className="form-grid">
        <label className="filter-field">
          <span>Estado</span>
          <select
            value={form.estado}
            onChange={(event) => set("estado", event.target.value)}
          >
            {WORK_STATES.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <input
          className="form-field"
          maxLength="60"
          value={form.idiomaOriginal}
          placeholder="Idioma original"
          onChange={(event) => set("idiomaOriginal", event.target.value)}
        />
      </div>
      {work.tipo === "externa" && (
        <>
          <input
            className="form-field"
            maxLength="120"
            value={form.autorOriginal}
            placeholder="Autor original"
            onChange={(event) => set("autorOriginal", event.target.value)}
          />
          <input
            className="form-field"
            maxLength="2048"
            value={form.origenUrl}
            placeholder="URL de origen"
            onChange={(event) => set("origenUrl", event.target.value)}
          />
        </>
      )}
      <section className="home-section">
        <div className="section-heading">
          <h3>Géneros</h3>
        </div>
        <div className="genre-grid">
          {GENRES.map((genre) => (
            <button
              type="button"
              key={genre}
              className={
                form.generos.includes(genre)
                  ? "genre-tile genre-tile-active"
                  : "genre-tile"
              }
              onClick={() => toggleGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </section>
      <input
        className="form-field"
        value={form.etiquetas}
        placeholder="Etiquetas separadas por coma"
        onChange={(event) => set("etiquetas", event.target.value)}
      />
      {(work.autorId === user?.uid || isAdmin(profile)) && (
        <section className="advanced-settings-panel">
          <p className="section-kicker">Colaboradores</p>
          <textarea
            className="form-field full-width"
            rows={4}
            value={form.colaboradores}
            placeholder="UID de cada colaborador, uno por línea"
            onChange={(event) => set("colaboradores", event.target.value)}
          />
          <p className="permission-note">
            Los colaboradores pueden crear capítulos y editar o eliminar los
            propios. No pueden administrar colaboradores.
          </p>
        </section>
      )}
      <button type="button" disabled={saving} onClick={save}>
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </main>
  );
}
