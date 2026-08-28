import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getLiked, toggleLike } from "../services/interactionService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

export default function LikeButton({ type, contentId, obraId, count = 0 }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [displayCount, setDisplayCount] = useState(Number(count || 0));
  useEffect(() => setDisplayCount(Number(count || 0)), [count]);
  useEffect(() => {
    getLiked(type, contentId, user?.uid).then(setLiked).catch(console.error);
  }, [contentId, type, user?.uid]);
  const handleToggle = async () => {
    if (!user) return alert("Necesitás iniciar sesión para dar un like.");
    try {
      setBusy(true);
      const nextLiked = await toggleLike({
        type,
        contentId,
        obraId,
        userId: user.uid,
      });
      setLiked(nextLiked);
      setDisplayCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)));
    } catch (error) {
      console.error("No se pudo actualizar el like:", error);
      alert(getFriendlyFirebaseError(error, "like"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className="btn-secondary"
      disabled={busy}
      onClick={handleToggle}
    >
      {liked ? "♥ Te gusta" : "♡ Me gusta"} · {displayCount}
    </button>
  );
}
