export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

export const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "administrador",
  "moderador",
  "moderation",
  "mod",
  "support",
  "soporte",
  "umbral",
  "umbraldehistorias",
  "system",
  "staff",
]);

export const normalizeUsername = (value = "") =>
  String(value).trim().toLowerCase();

export function getUsernameError(value) {
  const username = normalizeUsername(value);
  if (!username) return "Elegí un nombre de usuario.";
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return `El nombre de usuario debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Usá sólo letras, números y guiones bajos, sin espacios.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "Ese nombre de usuario está reservado.";
  }
  return "";
}
