import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

const projectId = "umbral-rules-test";
const rules = readFileSync("firestore.rules", "utf8");
const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { host: "127.0.0.1", port: 8080, rules },
});

// El emulador puede conservar datos entre ejecuciones. Cada prueba debe partir
// de una base vacía para que un fallo previo no convierta un create en update.
await testEnv.clearFirestore();

const userProfile = (uid, username, overrides = {}) => ({
  uid,
  nombre: username,
  username,
  usernameNormalizado: username,
  email: `${username}@example.test`,
  bio: "",
  fotoUrl: "",
  rol: "usuario",
  puedeTraducir: false,
  traduccionBloqueada: false,
  capitulosLeidos: 0,
  mostrarSeguidasPublicas: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const publicProfile = (uid, username, overrides = {}) => ({
  uid,
  nombre: username,
  username,
  usernameNormalizado: username,
  bio: "",
  fotoUrl: "",
  rol: "usuario",
  mostrarSeguidasPublicas: false,
  seguidoresCount: 0,
  siguiendoCount: 0,
  fechaRegistro: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const work = (authorId, username, overrides = {}) => ({
  titulo: "Obra de prueba",
  tituloBusqueda: "obra de prueba",
  slug: "obra-de-prueba",
  descripcion:
    "Una descripción suficiente para probar las reglas de seguridad.",
  portadaUrl: "",
  autorId: authorId,
  autorNombre: username,
  autorBusqueda: username,
  autorUsername: username,
  autorUsernameNormalizado: username,
  generos: ["Fantasía"],
  etiquetas: [],
  tipo: "original",
  idiomaOriginal: "Español",
  autorOriginal: "",
  origenUrl: "",
  estado: "en_progreso",
  colaboradores: [],
  vistas: 0,
  likes: 0,
  comentariosCount: 0,
  seguidoresCount: 0,
  capitulosCount: 0,
  traduccionesCount: 0,
  fechaCreacion: serverTimestamp(),
  fechaActualizacion: serverTimestamp(),
  ...overrides,
});

const chapter = (authorId, username, overrides = {}) => ({
  obraId: "work-bob",
  traduccionId: null,
  titulo: "Capítulo de prueba",
  numero: 1,
  bloques: [{ tipo: "texto", contenido: "Contenido de prueba" }],
  contenidoTexto: "Contenido de prueba",
  autorId: authorId,
  autorNombre: username,
  autorUsername: username,
  fechaCreacion: serverTimestamp(),
  fechaActualizacion: serverTimestamp(),
  vistas: 0,
  likes: 0,
  comentariosCount: 0,
  ...overrides,
});

try {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const seed = writeBatch(db);
    [
      ["alice", "alice"],
      ["bob", "bob"],
      ["admin", "admin"],
      ["reader200", "reader200"],
    ].forEach(([uid, username]) => {
      seed.set(
        doc(db, "usuarios", uid),
        userProfile(
          uid,
          username,
          uid === "admin"
            ? { rol: "admin" }
            : uid === "reader200"
              ? { capitulosLeidos: 200 }
              : {},
        ),
      );
      seed.set(doc(db, "perfilesPublicos", uid), publicProfile(uid, username));
      seed.set(doc(db, "usernames", username), {
        uid,
        username,
        createdAt: new Date(),
      });
    });
    seed.set(doc(db, "usuarios", "legacy"), {
      uid: "legacy",
      nombre: "Legacy",
      email: "legacy@example.test",
      bio: "",
      fotoUrl: "",
      rol: "usuario",
      puedeTraducir: false,
      capitulosLeidos: 0,
      mostrarSeguidasPublicas: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    seed.set(doc(db, "perfilesPublicos", "legacy"), {
      uid: "legacy",
      nombre: "Legacy",
      bio: "",
      fotoUrl: "",
      rol: "usuario",
      mostrarSeguidasPublicas: false,
      seguidoresCount: 0,
      siguiendoCount: 0,
      fechaRegistro: new Date(),
      updatedAt: new Date(),
    });
    seed.set(
      doc(db, "obras", "work-bob"),
      work("bob", "bob", { colaboradores: ["alice"] }),
    );
    seed.set(
      doc(db, "obras", "external-work"),
      work("admin", "admin", {
        titulo: "Obra externa",
        slug: "obra-externa",
        tipo: "externa",
        autorOriginal: "Autor externo",
      }),
    );
    seed.set(doc(db, "capitulos", "chapter-bob"), chapter("bob", "bob"));
    seed.set(doc(db, "likes", "obra_work-bob_bob"), {
      tipoContenido: "obra",
      contenidoId: "work-bob",
      obraId: "work-bob",
      usuarioId: "bob",
      fecha: new Date(),
    });
    await seed.commit();
  });

  const alice = testEnv.authenticatedContext("alice").firestore();
  const bob = testEnv.authenticatedContext("bob").firestore();
  const admin = testEnv.authenticatedContext("admin").firestore();
  const reader200 = testEnv.authenticatedContext("reader200").firestore();
  const newcomer = testEnv.authenticatedContext("newcomer").firestore();
  const legacy = testEnv.authenticatedContext("legacy").firestore();

  const profileBatch = writeBatch(newcomer);
  profileBatch.set(doc(newcomer, "usuarios", "newcomer"), {
    ...userProfile("newcomer", "new_reader"),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  profileBatch.set(doc(newcomer, "perfilesPublicos", "newcomer"), {
    ...publicProfile("newcomer", "new_reader"),
    fechaRegistro: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  profileBatch.set(doc(newcomer, "usernames", "new_reader"), {
    uid: "newcomer",
    username: "new_reader",
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(profileBatch.commit());
  await assertFails(
    setDoc(doc(newcomer, "usernames", "alice"), {
      uid: "newcomer",
      username: "alice",
      createdAt: serverTimestamp(),
    }),
  );

  const legacyMigration = writeBatch(legacy);
  legacyMigration.set(doc(legacy, "usernames", "legacy_reader"), {
    uid: "legacy",
    username: "legacy_reader",
    createdAt: serverTimestamp(),
  });
  legacyMigration.update(doc(legacy, "usuarios", "legacy"), {
    username: "legacy_reader",
    usernameNormalizado: "legacy_reader",
    updatedAt: serverTimestamp(),
  });
  legacyMigration.update(doc(legacy, "perfilesPublicos", "legacy"), {
    username: "legacy_reader",
    usernameNormalizado: "legacy_reader",
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(legacyMigration.commit());

  await assertSucceeds(getDoc(doc(alice, "likes", "obra_work-bob_alice")));
  await assertFails(getDoc(doc(alice, "likes", "obra_work-bob_bob")));
  await assertSucceeds(
    setDoc(doc(alice, "likes", "obra_work-bob_alice"), {
      tipoContenido: "obra",
      contenidoId: "work-bob",
      obraId: "work-bob",
      usuarioId: "alice",
      fecha: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(alice, "likes", "obra_work-bob_bob"), {
      tipoContenido: "obra",
      contenidoId: "work-bob",
      obraId: "work-bob",
      usuarioId: "bob",
      fecha: serverTimestamp(),
    }),
  );

  await assertSucceeds(getDoc(doc(alice, "seguimientos", "alice_work-bob")));
  await assertSucceeds(
    setDoc(doc(alice, "seguimientos", "alice_work-bob"), {
      usuarioId: "alice",
      obraId: "work-bob",
      fechaSeguimiento: serverTimestamp(),
      ultimoCapituloVisto: "",
      ultimoCapituloDisponible: "chapter-bob",
      ultimoDisponibleNumero: 1,
    }),
  );
  await assertFails(
    setDoc(doc(alice, "seguimientos", "bob_work-bob"), {
      usuarioId: "bob",
      obraId: "work-bob",
      fechaSeguimiento: serverTimestamp(),
      ultimoCapituloVisto: "",
      ultimoCapituloDisponible: "chapter-bob",
      ultimoDisponibleNumero: 1,
    }),
  );

  await assertSucceeds(
    setDoc(doc(alice, "comentarios", "alice-comment"), {
      tipoContenido: "obra",
      contenidoId: "work-bob",
      obraId: "work-bob",
      padreId: "",
      autorId: "alice",
      autorNombre: "alice",
      autorUsername: "alice",
      autorFoto: "",
      contenido: "Comentario de Alice",
      fecha: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(alice, "comentarios", "invalid-comment"), {
      tipoContenido: "obra",
      contenidoId: "work-bob",
      obraId: "work-bob",
      padreId: "",
      autorId: "alice",
      autorNombre: "alice",
      autorUsername: "alice",
      autorFoto: "",
      contenido: "",
      fecha: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(alice, "comentarios", "alice-comment"), {
      contenido: "Comentario editado",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(deleteDoc(doc(bob, "comentarios", "alice-comment")));
  await assertSucceeds(deleteDoc(doc(admin, "comentarios", "alice-comment")));

  await assertSucceeds(
    updateDoc(doc(alice, "usuarios", "alice"), {
      bio: "Nueva bio",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(alice, "perfilesPublicos", "alice"), {
      bio: "Nueva bio pÃºblica",
      fotoUrl: "https://example.test/avatar.png",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(alice, "usuarios", "alice"), {
      rol: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(alice, "perfilesPublicos", "alice"), {
      seguidoresCount: 99,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(alice, "obras", "work-bob"), {
      colaboradores: ["alice", "reader200"],
      fechaActualizacion: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(bob, "obras", "work-bob"), {
      colaboradores: ["alice", "reader200"],
      fechaActualizacion: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(
      doc(bob, "capitulos", "chapter-bob-new"),
      chapter("bob", "bob", { numero: 2 }),
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(alice, "capitulos", "chapter-alice"),
      chapter("alice", "alice", { numero: 2 }),
    ),
  );
  await assertFails(deleteDoc(doc(alice, "capitulos", "chapter-bob")));
  await assertSucceeds(deleteDoc(doc(alice, "capitulos", "chapter-alice")));

  await assertSucceeds(
    setDoc(doc(alice, "seguimientosAutores", "alice_bob"), {
      usuarioId: "alice",
      autorId: "bob",
      fechaSeguimiento: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(alice, "seguimientosAutores", "alice_alice"), {
      usuarioId: "alice",
      autorId: "alice",
      fechaSeguimiento: serverTimestamp(),
    }),
  );

  await assertFails(
    setDoc(
      doc(alice, "obras", "alice-external"),
      work("alice", "alice", {
        tipo: "externa",
        autorOriginal: "Origen",
      }),
    ),
  );
  await assertSucceeds(
    setDoc(
      doc(admin, "obras", "admin-external"),
      work("admin", "admin", {
        tipo: "externa",
        autorOriginal: "Origen",
      }),
    ),
  );

  await assertSucceeds(
    setDoc(doc(reader200, "traducciones", "translation-200"), {
      obraId: "external-work",
      idioma: "Portugués",
      traductorPrincipalId: "reader200",
      traductorPrincipalNombre: "reader200",
      traductorPrincipalUsername: "reader200",
      traductores: ["reader200"],
      estado: "publicada",
      likes: 0,
      comentariosCount: 0,
      capitulosCount: 0,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    }),
  );

  await assertFails(
    setDoc(doc(alice, "progresoLectura", "bob_work-bob"), {
      usuarioId: "bob",
      obraId: "work-bob",
      capituloId: "chapter-bob",
      numeroCapitulo: 1,
      tituloCapitulo: "Capítulo de prueba",
      traduccionId: "",
      fechaLectura: serverTimestamp(),
      ultimoDisponible: "chapter-bob",
      ultimoDisponibleNumero: 1,
      ultimoDisponibleTitulo: "Capítulo de prueba",
    }),
  );

  console.log("Reglas de Firestore: pruebas de seguridad aprobadas.");
} finally {
  await testEnv.cleanup();
}
