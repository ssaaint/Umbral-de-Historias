import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getFollowing, toggleFollow } from "../services/interactionService";
import { getFriendlyFirebaseError } from "../utils/firebaseErrorUtils";

export default function FollowButton({ workId, latestChapter, count }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [displayCount, setDisplayCount] = useState(Number(count || 0));
  useEffect(() => setDisplayCount(Number(count || 0)), [count]);
  useEffect(() => {
    getFollowing(workId, user?.uid).then(setFollowing).catch(console.error);
  }, [workId, user?.uid]);
  const handleToggle = async () => {
    if (!user) return alert("Necesitás iniciar sesión para seguir una obra.");
    try {
      setBusy(true);
      const nextFollowing = await toggleFollow({
        workId,
        userId: user.uid,
        latestChapter,
      });
      setFollowing(nextFollowing);
      setDisplayCount((current) =>
        Math.max(0, current + (nextFollowing ? 1 : -1)),
      );
    } catch (error) {
      console.error("No se pudo actualizar el seguimiento:", error);
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
      {following ? "Dejar de seguir" : "Seguir obra"}
      {typeof count === "number" ? ` · ${displayCount}` : ""}
    </button>
  );
}
