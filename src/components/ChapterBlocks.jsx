export default function ChapterBlocks({ blocks = [] }) {
  return (
    <div className="chapter-content">
      {blocks.map((block, index) => {
        if (block.tipo === "imagen")
          return (
            <figure className="chapter-image" key={`image-${index}`}>
              <img
                src={block.url}
                alt={block.alt || "Imagen del capítulo"}
                loading="lazy"
              />
              <figcaption>{block.alt || ""}</figcaption>
            </figure>
          );
        if (block.tipo === "separador")
          return <hr className="divider" key={`separator-${index}`} />;
        return <p key={`text-${index}`}>{block.contenido}</p>;
      })}
    </div>
  );
}
