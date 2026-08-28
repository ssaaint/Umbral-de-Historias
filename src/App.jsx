import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, isFirebaseConfigured, missingFirebaseConfig } from "./firebase";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Stars from "./components/Stars";
import Home from "./pages/Home";
import Explorar from "./pages/Explorar";
import Perfil from "./pages/Perfil";
import Crear from "./pages/Crear";
import Login from "./pages/Login";
import ObraDetalle from "./pages/ObraDetalle";
import EditarObra from "./pages/EditarObra";
import NuevoCapitulo from "./pages/NuevoCapitulo";
import EditarCapitulo from "./pages/EditarCapitulo";
import ObraCapituloLectura from "./pages/ObraCapituloLectura";
import SubirTraduccionObra from "./pages/SubirTraduccionObra";
import Admin from "./pages/Admin";

function Application() {
  const { user, profile } = useAuth();
  useEffect(() => {
    document.title = "Umbral de Historias";
  }, []);
  return (
    <div className="app">
      <Stars />
      <Navbar user={user} profile={profile} onLogout={() => signOut(auth)} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explorar" element={<Explorar />} />
        <Route path="/login" element={<Login />} />
        <Route path="/crear" element={<Crear />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/perfil/:uid" element={<Perfil />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/obra/:obraId" element={<ObraDetalle />} />
        <Route path="/obra/:obraId/editar" element={<EditarObra />} />
        <Route
          path="/obra/:obraId/capitulos/nuevo"
          element={<NuevoCapitulo />}
        />
        <Route
          path="/obra/:obraId/traducciones/nueva"
          element={<SubirTraduccionObra />}
        />
        <Route
          path="/obra/:obraId/capitulo/:capituloId"
          element={<ObraCapituloLectura />}
        />
        <Route
          path="/capitulos/:capituloId/editar"
          element={<EditarCapitulo />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default function App() {
  if (!isFirebaseConfigured) {
    return (
      <div className="app">
        <Stars />
        <main className="page">
          <section className="empty-state setup-notice">
            <p className="section-kicker">Configuración inicial</p>
            <h1>Conectá tu nuevo proyecto de Firebase</h1>
            <p>
              Creá <code>.env.local</code> a partir de <code>.env.example</code>
              y completá la configuración de tu app web de Firebase. Después,
              reiniciá <code>npm run dev</code>.
            </p>
            <p className="setup-missing">
              Faltan: {missingFirebaseConfig.join(", ")}
            </p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Application />
    </AuthProvider>
  );
}
