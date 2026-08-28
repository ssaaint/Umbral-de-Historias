import { DISCORD_URL } from "../utils/contentModel";

export default function Footer() {
  return (
    <footer className="site-footer">
      <section className="support-panel">
        <div>
          <p className="section-kicker">Comunidad</p>
          <h2>¿Necesitás ayuda?</h2>
          <p>
            ¿Encontraste un error, querés sugerir una mejora o pedir una obra
            para traducción?
          </p>
        </div>
        <a
          className="btn-link btn-link-primary"
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
        >
          Unirse al Discord
        </a>
      </section>
    </footer>
  );
}
