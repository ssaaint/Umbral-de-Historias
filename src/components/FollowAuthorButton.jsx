import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getFollowingAuthor,
  toggleAuthorFollow,
} from "../services/interactionService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

export default function FollowAuthorButton({ authorId, onChange }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getFollowingAuthor(authorId, user?.uid)
      .then(setFollowing)
      .catch((error) =>
        console.error("No se pudo consultar el seguimiento:", error),
      );
  }, [authorId, user?.uid]);

  if (!authorId || authorId === user?.uid) return null;

  const handleToggle = async () => {
    if (!user)
      return alert("Necesitás iniciar sesión para seguir a una persona.");
    try {
      setBusy(true);
      const nextFollowing = await toggleAuthorFollow({
        authorId,
        userId: user.uid,
      });
      setFollowing(nextFollowing);
      onChange?.(nextFollowing ? 1 : -1);
    } catch (error) {
      console.error("No se pudo actualizar el seguimiento del perfil:", error);
      alert(getFriendlyFirebaseError(error, "seguimiento"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className="btn-follow-story"
      disabled={busy}
      onClick={handleToggle}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
