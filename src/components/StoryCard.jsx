import { Link } from "react-router-dom";
import { getWorkTypeLabel } from "../utils/contentModel";

export default function StoryCard({
  historia: obra,
  destacado = false,
  posicion,
  resumenCaracteres = 80,
  compact = false,
}) {
  const generos = obra.generos?.length ? obra.generos : ["Sin género"];
  const tags = (obra.etiquetas || []).slice(0, 3);
  const excerpt = String(obra.descripcion || "").slice(0, resumenCaracteres);
  const cardClasses = [
    "card",
    "story-card",
    destacado ? "premium story-card-featured" : "",
    compact ? "story-card-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link to={`/obra/${obra.id}`} className="story-link">
      <article className={cardClasses}>
        <div className="story-card-cover">
          {obra.portadaUrl ? (
            <img
              src={obra.portadaUrl}
              alt={obra.titulo || "Portada"}
              loading="lazy"
            />
          ) : (
            <span>{(obra.titulo || "N").slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="story-card-topline">
          {destacado && <span className="story-rank">Top {posicion}</span>}
          <span className="story-pill">{generos[0]}</span>
          <span className="story-pill story-pill-muted">
            {getWorkTypeLabel(obra.tipo)}
          </span>
        </div>
        <h3>{obra.titulo || "Sin título"}</h3>
        <div className="story-author-row">
          <div className="story-author-avatar">
            <span>{(obra.autorNombre || "U").slice(0, 1).toUpperCase()}</span>
          </div>
          <p className="story-meta">
            {obra.autorNombre || obra.autorOriginal || "Autor desconocido"}
          </p>
        </div>
        {obra.tipo === "externa" && obra.autorOriginal && (
          <p className="story-origin">Autor original: {obra.autorOriginal}</p>
        )}
        <p className="story-excerpt">
          {excerpt || "Sin descripción todavía."}
          {excerpt ? "..." : ""}
        </p>
        {tags.length > 0 && (
          <div className="story-tags">
            {tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
        <div className="story-card-footer">
          <span>{obra.likes || 0} likes</span>
          <span>
            {obra.capitulosDisponibles ?? obra.capitulosCount ?? 0} capítulos
          </span>
        </div>
      </article>
    </Link>
  );
}
