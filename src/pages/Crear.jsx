import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createWork } from "../services/workService";
import {
  GENRES,
  DISCORD_URL,
  WORK_STATES,
  WORK_TYPES,
  cleanText,
  toTextList,
  toUidList,
} from "../utils/contentModel";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

const initialForm = {
  titulo: "",
  descripcion: "",
  portadaUrl: "",
  generos: [],
  etiquetas: "",
  idiomaOriginal: "Español",
  tipo: WORK_TYPES.ORIGINAL,
  estado: "en_progreso",
  autorOriginal: "",
  origenUrl: "",
  colaboradores: "",
};

export default function Crear() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const toggleGenre = (genre) =>
    set(
      "generos",
      form.generos.includes(genre)
        ? form.generos.filter((item) => item !== genre)
        : [...form.generos, genre].slice(0, 4),
    );
  const publish = async () => {
    if (!user) return alert("Necesitás iniciar sesión para crear una obra.");
    if (!profile?.usernameNormalizado)
      return alert("Primero elegí tu nombre de usuario desde tu perfil.");
    const title = cleanText(form.titulo);
    const description = cleanText(form.descripcion);
    const external = form.tipo === WORK_TYPES.EXTERNA;
    if (title.length < 3 || title.length > 120)
      return alert("El título debe tener entre 3 y 120 caracteres.");
    if (description.length < 20 || description.length > 3000)
      return alert("La descripción debe tener entre 20 y 3000 caracteres.");
    if (form.generos.length === 0) return alert("Elegí al menos un género.");
    if (
      !cleanText(form.idiomaOriginal) ||
      (external && !cleanText(form.autorOriginal))
    )
      return alert(
        "Completá el idioma original y el autor de la obra externa.",
      );
    if (external && !isAdmin)
      return alert("Sólo un administrador puede incorporar obras externas.");
    try {
      setSaving(true);
      const work = await createWork({
        values: {
          ...form,
          titulo: title,
          descripcion: description,
          etiquetas: toTextList(form.etiquetas),
          colaboradores: toUidList(form.colaboradores),
        },
        user,
        profile,
      });
      navigate(`/obra/${work.id}`);
    } catch (error) {
      console.error("No se pudo crear la obra:", error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <p className="page">Cargando tu perfil…</p>;
  if (!user)
    return (
      <main className="page page-form">
        <h2>Crear una obra</h2>
        <p className="empty-state">Iniciá sesión para publicar.</p>
      </main>
    );
  return (
    <main className="page page-form">
      <p className="section-kicker">Nueva publicación</p>
      <h2>Crear obra</h2>
      <p className="permission-note">
        El identificador técnico se genera automáticamente a partir del título.
      </p>
      {!isAdmin && (
        <aside className="discord-request-card">
          <strong>¿Querés solicitar una obra para traducción?</strong>
          <p>
            Pedila en nuestro Discord. Sólo administración incorpora fichas
            externas.
          </p>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">
            Pedir una obra en Discord
          </a>
        </aside>
      )}
      <input
        className="form-field"
        value={form.titulo}
        maxLength="120"
        placeholder="Título"
        onChange={(event) => set("titulo", event.target.value)}
      />
      <textarea
        className="form-field full-width"
        rows={5}
        maxLength="3000"
        value={form.descripcion}
        placeholder="Descripción o sinopsis"
        onChange={(event) => set("descripcion", event.target.value)}
      />
      <div className="form-grid">
        <label className="filter-field">
          <span>Tipo de obra</span>
          <select
            value={form.tipo}
            onChange={(event) => set("tipo", event.target.value)}
          >
            <option value={WORK_TYPES.ORIGINAL}>Original</option>
            {isAdmin && (
              <option value={WORK_TYPES.EXTERNA}>Obra externa</option>
            )}
          </select>
        </label>
        <label className="filter-field">
          <span>Estado</span>
          <select
            value={form.estado}
            onChange={(event) => set("estado", event.target.value)}
          >
            {WORK_STATES.map((state) => (
              <option key={state} value={state}>
                {state.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        className="form-field"
        value={form.idiomaOriginal}
        maxLength="60"
        placeholder="Idioma original"
        onChange={(event) => set("idiomaOriginal", event.target.value)}
      />
      {form.tipo === WORK_TYPES.EXTERNA && (
        <>
          <input
            className="form-field"
            value={form.autorOriginal}
            maxLength="120"
            placeholder="Autor original"
            onChange={(event) => set("autorOriginal", event.target.value)}
          />
          <input
            className="form-field"
            value={form.origenUrl}
            maxLength="2048"
            placeholder="URL de origen (opcional)"
            onChange={(event) => set("origenUrl", event.target.value)}
          />
          <p className="permission-note">
            Esta obra se identificará siempre como externa y conservará sus
            datos de origen.
          </p>
        </>
      )}
      <input
        className="form-field"
        value={form.portadaUrl}
        maxLength="2048"
        placeholder="URL de portada (opcional)"
        onChange={(event) => set("portadaUrl", event.target.value)}
      />
      {form.portadaUrl && (
        <div className="image-preview">
          <div className="image-preview-frame">
            <img src={form.portadaUrl} alt="Vista previa de portada" />
          </div>
          <p>Vista previa</p>
        </div>
      )}
      <section className="home-section">
        <div className="section-heading">
          <p className="section-kicker">Hasta cuatro</p>
          <h3>Géneros</h3>
        </div>
        <div className="genre-grid">
          {GENRES.map((genre) => (
            <button
              type="button"
              key={genre}
              className={`genre-tile ${form.generos.includes(genre) ? "genre-tile-active" : ""}`}
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
      <textarea
        className="form-field full-width"
        rows={3}
        value={form.colaboradores}
        placeholder="UID de colaboradores (uno por línea, opcional)"
        onChange={(event) => set("colaboradores", event.target.value)}
      />
      <p className="permission-note">
        Sólo vos y la administración podrán cambiar colaboradores después de
        publicar.
      </p>
      <button type="button" disabled={saving} onClick={publish}>
        {saving ? "Publicando…" : "Publicar obra"}
      </button>
    </main>
  );
}
