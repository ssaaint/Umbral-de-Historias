import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { useAuth } from "../hooks/useAuth";
import StoryCard from "../components/StoryCard";
import { chapterRoute } from "../services/workService";

const take = (items, size = 4) => items.slice(0, size);
const dateValue = (value) => value?.toMillis?.() || value?.seconds * 1000 || 0;

export default function Home() {
  const { user } = useAuth();
  const [works, setWorks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [followed, setFollowed] = useState([]);
  useEffect(() => {
    getDocs(
      query(
        collection(db, "obras"),
        orderBy("fechaActualizacion", "desc"),
        limit(80),
      ),
    )
      .then((snapshot) =>
        setWorks(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
        ),
      )
      .catch((error) => console.error("No se pudo cargar el inicio:", error));
  }, []);
  useEffect(() => {
    if (!user) {
      setProgress([]);
      setFollowed([]);
      return;
    }
    (async () => {
      try {
        const [progressSnap, followSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "progresoLectura"),
              where("usuarioId", "==", user.uid),
              orderBy("fechaLectura", "desc"),
              limit(8),
            ),
          ),
          getDocs(
            query(
              collection(db, "seguimientos"),
              where("usuarioId", "==", user.uid),
              orderBy("fechaSeguimiento", "desc"),
              limit(8),
            ),
          ),
        ]);
        const workById = new Map(works.map((work) => [work.id, work]));
        const resolve = async (entry) => {
          const cached = workById.get(entry.obraId);
          if (cached) return cached;

          const snapshot = await getDoc(doc(db, "obras", entry.obraId));
          return snapshot.exists()
            ? { id: snapshot.id, ...snapshot.data() }
            : null;
        };
        const resolvedProgress = await Promise.all(
          progressSnap.docs.map(async (item) => {
            const data = item.data();
            const work = await resolve(data);
            return work ? { work, data } : null;
          }),
        );
        const resolvedFollowed = await Promise.all(
          followSnap.docs.map(async (item) => {
            const data = item.data();
            const work = await resolve(data);
            return work ? { work, data } : null;
          }),
        );
        setProgress(resolvedProgress.filter(Boolean));
        setFollowed(resolvedFollowed.filter(Boolean));
      } catch (error) {
        console.error("No se pudo cargar tu lectura:", error);
      }
    })();
  }, [user, works]);
  const popular = useMemo(
    () =>
      take(
        [...works].sort(
          (a, b) =>
            (b.vistas || 0) - (a.vistas || 0) ||
            (b.seguidoresCount || 0) - (a.seguidoresCount || 0),
        ),
      ),
    [works],
  );
  const liked = useMemo(
    () =>
      take(
        works
          .filter((work) => work.likes > 0)
          .sort((a, b) => b.likes - a.likes),
      ),
    [works],
  );
  const mostRead = useMemo(
    () =>
      take(
        works
          .filter((work) => Number(work.vistas || 0) > 0)
          .sort((a, b) => Number(b.vistas || 0) - Number(a.vistas || 0)),
      ),
    [works],
  );
  const newest = useMemo(
    () =>
      take(
        [...works].sort(
          (a, b) => dateValue(b.fechaCreacion) - dateValue(a.fechaCreacion),
        ),
      ),
    [works],
  );
  return (
    <main className="page page-home">
      <section className="home-hero home-hero-minimal">
        <div className="home-hero-copy">
          <p className="section-kicker">Umbral de Historias</p>
          <h1>Tu próxima lectura empieza acá.</h1>
          <p>
            Descubrí obras originales, seguí traducciones y guardá el punto
            exacto donde te quedaste.
          </p>
          <div className="hero-actions">
            <Link to="/explorar" className="btn-link btn-link-primary">
              Explorar obras
            </Link>
            {user && (
              <Link to="/crear" className="btn-link btn-link-ghost">
                Crear obra
              </Link>
            )}
          </div>
        </div>
      </section>
      <ReadingSection
        title="Continuar leyendo"
        kicker="Tu lectura"
        items={progress}
        render={(item) => <ReadingCard key={item.work.id} item={item} />}
      />
      <ReadingSection
        title="Seguidas"
        kicker="Biblioteca personal"
        items={followed}
        render={(item) => <FollowedCard key={item.work.id} item={item} />}
      />
      <WorkSection title="Popular" items={popular} />
      <div className="home-lists">
        <WorkSection title="Más leídas" items={mostRead} compact />
        <WorkSection title="Más likeadas" items={liked} compact />
        <WorkSection
          title="Recientemente actualizadas"
          items={take(works)}
          compact
        />
      </div>
      <div className="home-lists">
        <WorkSection title="Nuevas obras" items={newest} compact />
      </div>
    </main>
  );
}

function WorkSection({ title, items, compact = false }) {
  if (!items.length) return null;
  return (
    <section className="home-section">
      <div className="section-heading">
        <p className="section-kicker">Descubrimiento</p>
        <h2>{title}</h2>
      </div>
      <div className={compact ? "compact-story-list" : "grid explore-grid"}>
        {items.map((work, index) => (
          <StoryCard
            key={work.id}
            historia={work}
            destacado={!compact && title === "Popular"}
            posicion={index + 1}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
}
function ReadingSection({ title, kicker, items, render }) {
  if (!items.length) return null;
  return (
    <section className="home-section">
      <div className="section-heading">
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      <div className="compact-story-list">{items.map(render)}</div>
    </section>
  );
}
function ReadingCard({ item }) {
  const { work, data } = item;
  const route = chapterRoute(work.id, data.capituloId, data.traduccionId);
  const pending =
    Number(data.numeroCapitulo || 0) < Number(data.ultimoDisponibleNumero || 0);
  const progress = data.ultimoDisponibleNumero
    ? Math.min(
        100,
        Math.round(
          (Number(data.numeroCapitulo || 0) /
            Number(data.ultimoDisponibleNumero)) *
            100,
        ),
      )
    : null;
  return (
    <article className="continue-card">
      <div>
        <p className="section-kicker">
          {pending ? "Nuevo capítulo disponible" : "Última lectura"}
        </p>
        <h3>{work.titulo}</h3>
        <p>
          Capítulo {data.numeroCapitulo}: {data.tituloCapitulo}
        </p>
        {data.ultimoDisponibleNumero > 0 && (
          <p>Disponible hasta el capítulo {data.ultimoDisponibleNumero}</p>
        )}
        {progress !== null && <p>{progress}% del contenido disponible</p>}
      </div>
      <Link className="btn-link btn-link-primary" to={route}>
        Continuar
      </Link>
    </article>
  );
}
function FollowedCard({ item }) {
  const { work, data } = item;
  return (
    <article className="continue-card">
      <div>
        <p className="section-kicker">Seguida</p>
        <h3>{work.titulo}</h3>
        <p>
          {data.ultimoCapituloVisto
            ? `Último visto: ${data.ultimoCapituloVisto}`
            : "Todavía no empezaste a leerla."}
        </p>
      </div>
      <Link className="btn-link btn-link-primary" to={`/obra/${work.id}`}>
        Ver obra
      </Link>
    </article>
  );
}
