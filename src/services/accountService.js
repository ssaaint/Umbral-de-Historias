import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { getUsernameError, normalizeUsername } from "../utils/username";

const profileData = ({ user, username, nombre }) => ({
  uid: user.uid,
  nombre: nombre || username,
  username,
  usernameNormalizado: username,
  email: user.email || "",
  bio: "",
  fotoUrl: user.photoURL || "",
  rol: "usuario",
  puedeTraducir: false,
  traduccionBloqueada: false,
  capitulosLeidos: 0,
  mostrarSeguidasPublicas: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const publicProfileData = ({ user, username, nombre }) => ({
  uid: user.uid,
  nombre: nombre || username,
  username,
  usernameNormalizado: username,
  bio: "",
  fotoUrl: user.photoURL || "",
  rol: "usuario",
  mostrarSeguidasPublicas: false,
  seguidoresCount: 0,
  siguiendoCount: 0,
  fechaRegistro: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export async function checkUsernameAvailability(value) {
  const username = normalizeUsername(value);
  const validationError = getUsernameError(username);
  if (validationError) return { available: false, reason: validationError };

  const snapshot = await getDoc(doc(db, "usernames", username));
  return snapshot.exists()
    ? { available: false, reason: "Ese nombre de usuario ya está en uso." }
    : { available: true, username };
}

export async function createAccountProfile({
  user,
  username: rawUsername,
  nombre,
}) {
  const username = normalizeUsername(rawUsername);
  const validationError = getUsernameError(username);
  if (validationError) {
    const error = new Error(validationError);
    error.code = "username/invalid";
    throw error;
  }

  const privateRef = doc(db, "usuarios", user.uid);
  const publicRef = doc(db, "perfilesPublicos", user.uid);
  const usernameRef = doc(db, "usernames", username);

  await runTransaction(db, async (transaction) => {
    const [privateSnapshot, publicSnapshot, usernameSnapshot] =
      await Promise.all([
        transaction.get(privateRef),
        transaction.get(publicRef),
        transaction.get(usernameRef),
      ]);

    if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== user.uid) {
      const error = new Error("Ese nombre de usuario ya está en uso.");
      error.code = "username/taken";
      throw error;
    }

    const existingUsername = privateSnapshot.data()?.usernameNormalizado;
    if (existingUsername && existingUsername !== username) {
      const error = new Error(
        "Tu nombre de usuario no se puede cambiar desde esta pantalla.",
      );
      error.code = "username/immutable";
      throw error;
    }

    if (!usernameSnapshot.exists()) {
      transaction.set(usernameRef, {
        uid: user.uid,
        username,
        createdAt: serverTimestamp(),
      });
    }

    if (!privateSnapshot.exists()) {
      transaction.set(privateRef, profileData({ user, username, nombre }));
    } else if (!existingUsername) {
      transaction.update(privateRef, {
        username,
        usernameNormalizado: username,
        updatedAt: serverTimestamp(),
      });
    }

    if (!publicSnapshot.exists()) {
      transaction.set(publicRef, publicProfileData({ user, username, nombre }));
    } else if (!publicSnapshot.data()?.usernameNormalizado) {
      transaction.update(publicRef, {
        username,
        usernameNormalizado: username,
        updatedAt: serverTimestamp(),
      });
    }
  });
}
