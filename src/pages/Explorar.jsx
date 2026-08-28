import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import { normalizeForSearch } from "../utils/contentModel";

const initialFilters = {
  genero: "",
  idioma: "",
  tipo: "",
  estado: "",
  orden: "actualizadas",
  minCapitulos: "",
};

const dateValue = (value) => value?.toMillis?.() || value?.seconds * 1000 || 0;
const score = (work) =>
  Number(work.vistas || 0) +
  Number(work.likes || 0) * 2 +
  Number(work.seguidoresCount || 0) * 3;

const sorter = (items, mode) =>
  [...items].sort((a, b) => {
    if (mode === "populares") return score(b) - score(a);
    if (mode === "vistas") return Number(b.vistas || 0) - Number(a.vistas || 0);
    if (mode === "likes") return Number(b.likes || 0) - Number(a.likes || 0);
    if (mode === "seguidas") {
      return Number(b.seguidoresCount || 0) - Number(a.seguidoresCount || 0);
    }
    if (mode === "capitulos") {
      return (
        Number(b.capitulosDisponibles ?? b.capitulosCount ?? 0) -
        Number(a.capitulosDisponibles ?? a.capitulosCount ?? 0)
      );
    }
    if (mode === "nuevas")
      return dateValue(b.fechaCreacion) - dateValue(a.fechaCreacion);
    return dateValue(b.fechaActualizacion) - dateValue(a.fechaActualizacion);
  });

const chunks = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  );

async function loadRealChapterCounts(works) {
  const counts = new Map(works.map((work) => [work.id, 0]));
  await Promise.all(
    chunks(
      works.map((work) => work.id),
      30,
    ).map(async (workIds) => {
      if (!workIds.length) return;
      const snapshot = await getDocs(
        query(collection(db, "capitulos"), where("obraId", "in", workIds)),
      );
      snapshot.docs.forEach((chapter) => {
        const data = chapter.data();
        if (!data.traduccionId) {
          counts.set(data.obraId, Number(counts.get(data.obraId) || 0) + 1);
        }
      });
    }),
  );
  return counts;
}

async function enrichWorksWithPublicAuthors(works) {
  const authorIds = [
    ...new Set(works.map((work) => work.autorId).filter(Boolean)),
  ];
  const publicProfiles = await Promise.all(
    authorIds.map(async (authorId) => {
      const snapshot = await getDoc(doc(db, "perfilesPublicos", authorId));
      return snapshot.exists()
        ? [authorId, snapshot.data()]
        : [authorId, null];
    }),
  );
  const authors = new Map(publicProfiles);
  return works.map((work) => {
    const author = authors.get(work.autorId);
    if (!author) return work;
    return {
      ...work,
      autorNombre: work.autorNombre || author.nombre || "",
      autorUsername: work.autorUsername || author.username || "",
      autorUsernameNormalizado:
        work.autorUsernameNormalizado || author.usernameNormalizado || "",
    };
  });
}

export default function Explorar() {
  const [works, setWorks] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [chapterCountsReady, setChapterCountsReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const snapshot = await getDocs(
          query(
            collection(db, "obras"),
            orderBy("fechaActualizacion", "desc"),
            limit(100),
          ),
        );
        const loadedWorks = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        if (!active) return;
        setWorks(loadedWorks);
        setChapterCountsReady(false);

        try {
          const [worksWithAuthors, counts] = await Promise.all([
            enrichWorksWithPublicAuthors(loadedWorks).catch((error) => {
              console.error("No se pudieron cargar los autores pÃºblicos:", error);
              return loadedWorks;
            }),
            loadRealChapterCounts(loadedWorks),
          ]);
          if (active) {
            setWorks(
              worksWithAuthors.map((work) => ({
                ...work,
                capitulosDisponibles: Number(counts.get(work.id) || 0),
              })),
            );
            setChapterCountsReady(true);
          }
        } catch (error) {
          console.error("No se pudo comprobar el conteo de capítulos:", error);
          if (active) setChapterCountsReady(true);
        }
      } catch (error) {
        console.error("No se pudo explorar obras:", error);
        if (active) {
          setLoadError("No pudimos cargar las obras. Intentá nuevamente.");
          setWorks([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const genres = useMemo(() => {
    const unique = new Map();
    works.forEach((work) => {
      (work.generos || []).forEach((genre) => {
        const label = String(genre || "").trim();
        const normalized = normalizeForSearch(label);
        if (label && !unique.has(normalized)) unique.set(normalized, label);
      });
    });
    return [...unique.values()].sort((a, b) => a.localeCompare(b, "es"));
  }, [works]);

  const results = useMemo(() => {
    const term = normalizeForSearch(search);
    const minimum = Number(filters.minCapitulos || 0);
    return sorter(
      works.filter((work) => {
        const searchable = [
          work.tituloBusqueda,
          work.autorBusqueda,
          work.autorUsername,
          work.autorUsernameNormalizado,
          work.titulo,
          work.autorNombre,
          work.autorOriginal,
          ...(work.generos || []),
          ...(work.etiquetas || []),
        ]
          .map(normalizeForSearch)
          .join(" ");
        const genresMatch = (work.generos || []).some(
          (genre) =>
            normalizeForSearch(genre) === normalizeForSearch(filters.genero),
        );
        const chapterCount = Number(
          work.capitulosDisponibles ?? work.capitulosCount ?? 0,
        );
        return (
          (!term || searchable.includes(term)) &&
          (!filters.genero || genresMatch) &&
          (!filters.idioma ||
            normalizeForSearch(work.idiomaOriginal).includes(
              normalizeForSearch(filters.idioma),
            )) &&
          (!filters.tipo || work.tipo === filters.tipo) &&
          (!filters.estado || work.estado === filters.estado) &&
          (!filters.minCapitulos || chapterCount >= minimum)
        );
      }),
      filters.orden,
    );
  }, [filters, search, works]);

  const set = (key, value) =>
    setFilters((current) => ({ ...current, [key]: value }));

  return (
    <main className="page page-explore">
      <section className="explore-header">
        <div>
          <p className="section-kicker">Explorar</p>
          <h1>Encontrá tu próxima lectura</h1>
          <p>Buscá por título, autor, @username, género, etiqueta o idioma.</p>
        </div>
      </section>
      <section className="explore-controls">
        <SearchBar value={search} onChange={setSearch} />
        <div className="filters-panel explore-filters">
          <Select
            label="Género"
            value={filters.genero}
            onChange={(value) => set("genero", value)}
            options={genres.map((item) => [item, item])}
          />
          <input
            className="form-field"
            value={filters.idioma}
            placeholder="Idioma"
            onChange={(event) => set("idioma", event.target.value)}
          />
          <Select
            label="Tipo"
            value={filters.tipo}
            onChange={(value) => set("tipo", value)}
            options={[
              ["original", "Original"],
              ["externa", "Obra externa"],
            ]}
          />
          <Select
            label="Estado"
            value={filters.estado}
            onChange={(value) => set("estado", value)}
            options={[
              ["en_progreso", "En progreso"],
              ["completada", "Completada"],
              ["pausada", "Pausada"],
            ]}
          />
          <label className="filter-field">
            <span>Mínimo de capítulos</span>
            <input
              type="number"
              min="0"
              value={filters.minCapitulos}
              onChange={(event) => set("minCapitulos", event.target.value)}
            />
          </label>
          <Select
            label="Ordenar por"
            value={filters.orden}
            onChange={(value) => set("orden", value)}
            options={[
              ["populares", "Más populares"],
              ["nuevas", "Más recientes"],
              ["vistas", "Más vistas"],
              ["likes", "Más likes"],
              ["seguidas", "Más seguidas"],
              ["capitulos", "Más capítulos"],
              ["actualizadas", "Recientemente actualizadas"],
            ]}
          />
          <button
            type="button"
            className="btn-filter-reset"
            onClick={() => {
              setSearch("");
              setFilters(initialFilters);
            }}
          >
            Limpiar filtros
          </button>
        </div>
      </section>
      <section className="home-section">
        <div className="section-heading">
          <p className="section-kicker">
            {loading
              ? "Cargando"
              : !chapterCountsReady
                ? "Comprobando capítulos disponibles"
                : `${results.length} resultados`}
          </p>
          <h2>Obras</h2>
        </div>
        {loadError ? (
          <p className="form-error">{loadError}</p>
        ) : results.length ? (
          <div className="grid explore-grid">
            {results.map((work) => (
              <StoryCard key={work.id} historia={work} />
            ))}
          </div>
        ) : (
          <p className="empty-state">
            No encontramos obras con esa búsqueda y esos filtros.
          </p>
        )}
      </section>
    </main>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map(([option, text]) => (
          <option value={option} key={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
