export const getFriendlyFirebaseError = (error, action = "acción") => {
  const code = error?.code || "";

  if (code.startsWith("username/")) {
    return error.message || "No pudimos reservar ese nombre de usuario.";
  }

  if (code.includes("permission-denied")) {
    const messages = {
      comentario:
        "No pudimos guardar el comentario. Verificá que hayas iniciado sesión.",
      like: "No pudimos actualizar el like. Intentá nuevamente.",
      seguimiento: "No pudimos actualizar el seguimiento. Intentá nuevamente.",
      perfil: "No tenés permisos para editar este perfil.",
      traduccion: "Tu cuenta todavía no tiene permiso para traducir.",
    };
    return messages[action] || "No tenés permisos para realizar esta acción.";
  }

  if (code.includes("unauthenticated")) {
    return "Necesitás iniciar sesión para realizar esta acción.";
  }

  if (code.includes("not-found")) {
    return "No encontramos esta obra.";
  }

  if (code.includes("unavailable")) {
    return "Hay un problema temporal con el servidor. Intenta de nuevo.";
  }

  if (code.includes("failed-precondition")) {
    return "Falta preparar una configuración de Firebase. Intentá nuevamente en unos minutos.";
  }

  return `No pudimos completar esta ${action}. Intentá nuevamente.`;
};

export const alertFriendlyFirebaseError = (error, fallback) => {
  console.error("Error completo:", error);
  alert(fallback || getFriendlyFirebaseError(error));
};
