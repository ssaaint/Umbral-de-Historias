import { useState } from "react";

export default function ChapterBlocksEditor({ blocks, onChange }) {
  const [imageUrl, setImageUrl] = useState("");
  const [alt, setAlt] = useState("");
  const updateBlock = (index, patch) =>
    onChange(
      blocks.map((block, current) =>
        current === index ? { ...block, ...patch } : block,
      ),
    );
  const addImage = () => {
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) return;
    onChange([...blocks, { tipo: "imagen", url, alt: alt.trim() }]);
    setImageUrl("");
    setAlt("");
  };
  return (
    <section className="chapter-images-input">
      <div className="section-heading">
        <p className="section-kicker">Contenido</p>
        <h3>Bloques del capítulo</h3>
      </div>
      {blocks.map((block, index) => (
        <div className="chapter-image-form" key={`${block.tipo}-${index}`}>
          {block.tipo === "texto" ? (
            <textarea
              className="form-field full-width"
              rows={8}
              value={block.contenido}
              placeholder="Escribí el texto…"
              onChange={(event) =>
                updateBlock(index, { contenido: event.target.value })
              }
            />
          ) : block.tipo === "imagen" ? (
            <>
              <img
                className="chapter-image-preview"
                src={block.url}
                alt={block.alt || "Imagen del capítulo"}
              />
              <input
                className="form-field"
                value={block.alt || ""}
                placeholder="Texto alternativo"
                onChange={(event) =>
                  updateBlock(index, { alt: event.target.value })
                }
              />
            </>
          ) : (
            <p className="divider">Separador</p>
          )}
          <button
            type="button"
            className="btn-danger-soft"
            onClick={() =>
              onChange(blocks.filter((_, current) => current !== index))
            }
          >
            Quitar
          </button>
        </div>
      ))}
      <div className="form-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            onChange([...blocks, { tipo: "texto", contenido: "" }])
          }
        >
          Añadir texto
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onChange([...blocks, { tipo: "separador" }])}
        >
          Añadir separador
        </button>
      </div>
      <div className="chapter-image-form">
        <input
          className="form-field"
          value={imageUrl}
          placeholder="https://… URL de imagen"
          onChange={(event) => setImageUrl(event.target.value)}
        />
        <input
          className="form-field"
          value={alt}
          placeholder="Texto alternativo"
          onChange={(event) => setAlt(event.target.value)}
        />
        <button type="button" onClick={addImage}>
          Añadir imagen
        </button>
      </div>
    </section>
  );
}
