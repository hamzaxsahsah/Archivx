/**
 * Server-only Firebase Admin SDK (`firebase-admin` npm package).
 *
 * Uses a service account credential (`FIREBASE_SERVICE_ACCOUNT_PATH` / `_JSON`) — not
 * deprecated Realtime Database "database secrets" or legacy token generators.
 *
 * AchievHQ uses Firestore + Auth verification for API routes. If Firebase Console
 * shows a banner about database secrets, it refers to the optional **Realtime
 * Database** product; this app does not use RTDB or those secrets.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Prefer inline JSON in env (Vercel-friendly); file path is fallback for local dev. */
function readServiceAccountRaw(): string {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    if (
      (inline.startsWith('"') && inline.endsWith('"')) ||
      (inline.startsWith("'") && inline.endsWith("'"))
    ) {
      return inline.slice(1, -1);
    }
    return inline;
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (filePath) {
    const resolved = resolve(process.cwd(), filePath);
    if (!existsSync(resolved)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH not found: ${resolved}. Save the service account JSON next to the project or use FIREBASE_SERVICE_ACCOUNT_JSON (one line).`,
      );
    }
    return readFileSync(resolved, "utf8");
  }

  throw new Error(
    "Set FIREBASE_SERVICE_ACCOUNT_JSON (full service account object as one JSON line in .env.local) or FIREBASE_SERVICE_ACCOUNT_PATH=./path/to.json. Firebase → Project settings → Service accounts → Generate new private key.",
  );
}

function getServiceAccount() {
  let text: string;
  try {
    text = readServiceAccountRaw();
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(String(e));
  }

  let sa: Record<string, unknown>;
  try {
    sa = JSON.parse(text) as Record<string, unknown>;
  } catch (e) {
    const hint =
      e instanceof SyntaxError && /position/.test(String((e as Error).message))
        ? " Check for invalid placeholders — JSON must use double quotes only."
        : "";
    throw new Error(
      `Service account JSON could not be parsed.${hint} Use JSON.stringify(minified) for FIREBASE_SERVICE_ACCOUNT_JSON, or a valid file path.`,
    );
  }

  const key = sa.private_key;
  if (typeof key !== "string" || !key.trim()) {
    throw new Error(
      'Service account JSON must include a string "private_key" (PEM). Paste the full downloaded key into FIREBASE_SERVICE_ACCOUNT_JSON (one line) or point FIREBASE_SERVICE_ACCOUNT_PATH at the file.',
    );
  }
  if (!key.includes("PRIVATE KEY")) {
    throw new Error(
      'Service account "private_key" looks invalid (expected PEM with "PRIVATE KEY"). Re-download the key from Firebase.',
    );
  }

  return sa;
}

function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }
  const sa = getServiceAccount();
  return initializeApp({
    credential: cert(sa as Parameters<typeof cert>[0]),
  });
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export function adminAuth() {
  return getAuth(getAdminApp());
}
