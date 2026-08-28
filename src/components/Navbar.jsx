import { Link, NavLink } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import { DISCORD_URL } from "../utils/contentModel";

const navClass = ({ isActive }) =>
  `nav-link${isActive ? " nav-link-active" : ""}`;

export default function Navbar({ user, profile, onLogout }) {
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <span className="moon">UH</span>
        Umbral de Historias
      </Link>

      <div className="nav-right">
        <div className="nav-links">
          <NavLink to="/" end className={navClass}>
            Inicio
          </NavLink>
          <NavLink to="/explorar" className={navClass}>
            Explorar
          </NavLink>
          <NavLink to="/crear" className={navClass}>
            Crear
          </NavLink>
        </div>

        {user ? (
          <div className="nav-account">
            <NotificationBell user={user} />
            <NavLink to="/perfil" className={navClass}>
              Perfil
            </NavLink>
            {profile?.rol === "admin" && (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            )}
            <button onClick={onLogout} className="nav-link nav-button">
              Salir
            </button>
          </div>
        ) : (
          <div className="nav-account">
            <NavLink to="/login" className={navClass}>
              Login
            </NavLink>
          </div>
        )}
        <a
          className="nav-link discord-nav-link"
          href={DISCORD_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Unirse al Discord de Umbral de Historias"
          title="Discord"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.5 5.2A16.8 16.8 0 0 0 15.4 4l-.5 1.1a14.9 14.9 0 0 0-5.8 0L8.6 4a16.3 16.3 0 0 0-4.1 1.2C1.9 9.1 1.2 12.9 1.5 16.7A16.5 16.5 0 0 0 6.5 19l1.2-1.6a9.6 9.6 0 0 1-1.9-.9l.5-.4c3.7 1.7 7.7 1.7 11.4 0l.5.4c-.6.3-1.2.7-1.9.9l1.2 1.6a16.5 16.5 0 0 0 5-2.3c.4-4.4-.7-8.2-3-11.5ZM8.9 14.4c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
          </svg>
          <span>Discord</span>
        </a>
      </div>
    </nav>
  );
}
