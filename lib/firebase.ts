import {
  initializeApp,
  getApps,
  type FirebaseApp,
  type FirebaseOptions,
} from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

/** Trim and remove surrounding quotes — some editors add `'...'` which dotenv can include verbatim. */
function trimEnv(v: string | undefined): string {
  let s = (v ?? "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/**
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when each name appears as a
 * literal in source. Dynamic lookup like `process.env[key]` stays empty in the
 * browser bundle — do not refactor these to a generic helper.
 */
function getFirebaseConfig(): FirebaseOptions {
  const config: FirebaseOptions = {
    apiKey: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: trimEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };
  const measurementId = trimEnv(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
  if (measurementId) {
    config.measurementId = measurementId;
  }
  return config;
}

let app: FirebaseApp | undefined;

/** True if the value is still an obvious placeholder (avoid matching random "xxx" inside real API keys). */
function envLooksUnset(v: string | undefined): boolean {
  const s = (v ?? "").trim().toLowerCase();
  if (!s) return true;
  return (
    s === "paste" ||
    s.startsWith("paste_") ||
    s.includes("paste_api") ||
    s.includes("your_api_key") ||
    s.includes("placeholder") ||
    s.includes("changeme") ||
    s.includes("replace_me")
  );
}

function looksLikeFirebaseWebApiKey(v: string): boolean {
  return /^AIza[0-9A-Za-z\-_]{20,}$/.test(v.trim());
}

/** Firebase `appId` looks like `1:123:web:abc` or `1:123:android:def` (from google-services.json). */
function isValidFirebaseAppId(id: string): boolean {
  if (!id || envLooksUnset(id)) return false;
  return /^1:\d+:(web|android|ios):[0-9a-z]+$/i.test(id);
}

/**
 * Browser-only. Do not call during SSR/static generation.
 */
export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error("Firebase must be used in the browser");
  }
  const firebaseConfig = getFirebaseConfig();
  const apiKey = firebaseConfig.apiKey ?? "";
  if (!looksLikeFirebaseWebApiKey(apiKey)) {
    if (envLooksUnset(apiKey) || !apiKey.trim()) {
      throw new Error(
        'NEXT_PUBLIC_FIREBASE_API_KEY is missing or still a placeholder in .env.local (must start with "AIza"). Save the file after editing, then stop and run `npm run dev` again so Next.js reloads env.',
      );
    }
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_API_KEY must look like a Google Web API key (starts with "AIza…"). Copy it from Firebase Console → Project settings → Your apps → Web — no spaces or extra quotes.',
    );
  }
  if (envLooksUnset(firebaseConfig.messagingSenderId)) {
    throw new Error(
      "Replace NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID with the `messagingSenderId` number from the same Firebase Web config (often the same digits as in appId after 1:). Restart npm run dev.",
    );
  }
  if (!isValidFirebaseAppId(firebaseConfig.appId ?? "")) {
    throw new Error(
      "Replace NEXT_PUBLIC_FIREBASE_APP_ID in .env.local with the appId from Firebase Console → Project settings → Your apps → Web (format 1:…:web:… or 1:…:android:…). Remove any PASTE_ placeholder text. Restart npm run dev.",
    );
  }
  if (
    typeof window !== "undefined" &&
    firebaseConfig.appId?.includes(":android:")
  ) {
    console.info(
      "[Firebase] Using an Android app ID for the web client. Add a Web app in Firebase and set NEXT_PUBLIC_FIREBASE_APP_ID to its id (…:web:…) for the recommended setup.",
    );
  }
  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getAuthClient(): Auth {
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export async function signInWithGoogle() {
  const auth = getAuthClient();
  const db = getDb();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      steamId: null,
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
    });
  }

  return result;
}

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  steamId: string | null;
  createdAt?: unknown;
};

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid: d.uid as string,
    email: (d.email as string) ?? null,
    displayName: (d.displayName as string) ?? null,
    photoURL: (d.photoURL as string) ?? null,
    steamId: (d.steamId as string) ?? null,
    createdAt: d.createdAt,
  };
}
