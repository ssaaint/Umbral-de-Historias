export const WORK_TYPES = {
  ORIGINAL: "original",
  EXTERNA: "externa",
};

export const WORK_STATES = ["en_progreso", "completada", "pausada"];
export const USER_ROLES = ["usuario", "traductor", "moderador", "admin"];
export const DISCORD_URL = "https://discord.gg/PNJaXNgcMA";
// Política de elegibilidad preparada para una futura solicitud. La autorización
// efectiva siempre la conceden un administrador y las reglas de Firestore.
export const TRANSLATOR_REQUIREMENTS = {
  minChaptersRead: 200,
  minAccountAgeDays: 0,
  requireApproval: true,
  requireNoSanctions: true,
};
export const GENRES = [
  "Fantasía",
  "Romance",
  "Acción",
  "Aventura",
  "Misterio",
  "Terror",
  "Ciencia ficción",
  "Drama",
  "Comedia",
  "Histórico",
  "Thriller",
  "Slice of life",
];

export const normalizeForSearch = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const cleanText = (value = "") => String(value).trim();

export const toTextList = (value, maxItems = 12) => [
  ...new Set(
    String(value || "")
      .split(",")
      .map((item) => cleanText(item))
      .filter(Boolean)
      .slice(0, maxItems),
  ),
];

export const toUidList = (value, maxItems = 20) => [
  ...new Set(
    String(value || "")
      .split(/[\n,;]/)
      .map((item) => cleanText(item))
      .filter(Boolean)
      .slice(0, maxItems),
  ),
];

export const formatDate = (value) => {
  const date = value?.toDate?.() || (value instanceof Date ? value : null);
  return date
    ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(date)
    : "Recientemente";
};

export const isAdmin = (profile) => profile?.rol === "admin";

export const canTranslate = (profile) =>
  Boolean(
    profile &&
      (profile.rol === "admin" ||
        (profile.traduccionBloqueada !== true &&
          (profile.rol === "traductor" ||
            profile.puedeTraducir === true ||
            Number(profile.capitulosLeidos || 0) >=
              TRANSLATOR_REQUIREMENTS.minChaptersRead))),
  );

export const canRequestTranslatorPermission = (profile, accountCreatedAt) => {
  const ageInDays = accountCreatedAt?.toDate
    ? (Date.now() - accountCreatedAt.toDate().getTime()) / 86_400_000
    : 0;
  return (
    profile?.traduccionBloqueada !== true &&
    Number(profile?.capitulosLeidos || 0) >=
      TRANSLATOR_REQUIREMENTS.minChaptersRead &&
    ageInDays >= TRANSLATOR_REQUIREMENTS.minAccountAgeDays
  );
};

export const remainingChaptersForTranslation = (profile) =>
  Math.max(
    0,
    TRANSLATOR_REQUIREMENTS.minChaptersRead -
      Number(profile?.capitulosLeidos || 0),
  );

export const canManageWork = (work, user, profile) =>
  Boolean(user && work && (isAdmin(profile) || work.autorId === user.uid));

export const canWriteChapter = (chapter, work, user, profile) =>
  Boolean(
    user &&
      (isAdmin(profile) ||
        work?.autorId === user.uid ||
        chapter?.autorId === user.uid),
  );

export const getWorkTypeLabel = (type) =>
  type === WORK_TYPES.EXTERNA ? "Obra externa" : "Original";

export const makeBlocksFromText = (text) => {
  const content = cleanText(text);
  return content ? [{ tipo: "texto", contenido: content }] : [];
};

export const blockText = (blocks = []) =>
  blocks
    .filter((block) => block?.tipo === "texto")
    .map((block) => block.contenido || "")
    .join("\n\n");

export const validateBlocks = (blocks = []) => {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return "El capítulo necesita al menos un bloque de contenido.";
  }

  if (blocks.length > 120) return "El capítulo tiene demasiados bloques.";

  const total = blocks.reduce((sum, block) => {
    if (block?.tipo === "texto")
      return sum + String(block.contenido || "").length;
    if (block?.tipo === "imagen") return sum + String(block.url || "").length;
    return sum;
  }, 0);

  if (total > 50000) return "El capítulo supera el tamaño permitido.";

  const invalidImage = blocks.some(
    (block) =>
      block?.tipo === "imagen" &&
      (!/^https?:\/\//i.test(block.url || "") ||
        String(block.url).length > 2048),
  );

  return invalidImage ? "Cada imagen debe tener una URL http(s) válida." : "";
};
