import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  checkUsernameAvailability,
  createAccountProfile,
} from "../services/accountService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";
import { getUsernameError } from "../utils/username";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [nombre, setNombre] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const checkUsername = async () => {
    const validationError = getUsernameError(username);
    if (validationError) {
      setUsernameMessage(validationError);
      return false;
    }
    try {
      const availability = await checkUsernameAvailability(username);
      setUsernameMessage(
        availability.available
          ? "Nombre de usuario disponible."
          : availability.reason,
      );
      return availability.available;
    } catch (error) {
      console.error("No se pudo comprobar el nombre de usuario:", error);
      setUsernameMessage(
        "No pudimos comprobar este nombre de usuario. Intentá nuevamente.",
      );
      return false;
    }
  };
  const submit = async (register) => {
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6)
      return alert(
        "Ingresá un email válido y una contraseña de al menos 6 caracteres.",
      );
    if (register && !(await checkUsername())) return;
    try {
      setBusy(true);
      if (register) {
        let account = auth.currentUser;
        if (
          !account ||
          account.email?.toLowerCase() !== email.trim().toLowerCase()
        ) {
          const credential = await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password,
          );
          account = credential.user;
        }
        const visibleName = nombre.trim() || username.trim();
        await createAccountProfile({
          user: account,
          username,
          nombre: visibleName,
        });
        await updateProfile(account, { displayName: visibleName });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      navigate("/");
    } catch (error) {
      console.error("Error de autenticación:", error);
      alert(getFriendlyFirebaseError(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page page-form">
      <p className="section-kicker">Cuenta</p>
      <h2>Ingresar a Umbral</h2>
      <input
        className="form-field"
        type="email"
        autoComplete="email"
        value={email}
        placeholder="Email"
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        className="form-field"
        value={username}
        minLength="3"
        maxLength="20"
        autoComplete="username"
        placeholder="Nombre de usuario (para crear cuenta)"
        onBlur={checkUsername}
        onChange={(event) => {
          setUsername(event.target.value);
          setUsernameMessage("");
        }}
      />
      {usernameMessage && <p className="form-help">{usernameMessage}</p>}
      <input
        className="form-field"
        value={nombre}
        maxLength="60"
        autoComplete="nickname"
        placeholder="Nombre visible (opcional)"
        onChange={(event) => setNombre(event.target.value)}
      />
      <input
        className="form-field"
        type="password"
        autoComplete="current-password"
        value={password}
        placeholder="Contraseña"
        onChange={(event) => setPassword(event.target.value)}
      />
      <div className="form-actions">
        <button disabled={busy} onClick={() => submit(false)}>
          Ingresar
        </button>
        <button
          disabled={busy}
          className="btn-secondary"
          onClick={() => submit(true)}
        >
          Crear cuenta
        </button>
      </div>
    </main>
  );
}
