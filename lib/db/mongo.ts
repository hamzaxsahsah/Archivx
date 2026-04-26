import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
// Promise<MongoClient | null> so a failed connect resolves to null instead of
// staying as a rejected promise that poisons every subsequent call.
let connecting: Promise<MongoClient | null> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

function isServerless(): boolean {
  return process.env.NETLIFY === "true" || Boolean(process.env.VERCEL);
}

// Serverless: one connection per warm Lambda, fast timeouts so a bad URI
// degrades gracefully to Firestore instead of hanging the request.
const SERVERLESS_OPTS = {
  maxPoolSize: 1,
  minPoolSize: 0,
  maxIdleTimeMS: 10_000,
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 10_000,
  // Explicit TLS options required for Atlas on Node 20 / OpenSSL 3
  tls: true,
  tlsAllowInvalidCertificates: false,
};

// Docker / long-running Node process
const PERSISTENT_OPTS = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
  tls: true,
  tlsAllowInvalidCertificates: false,
};

function connectionOptions() {
  return isServerless() ? SERVERLESS_OPTS : PERSISTENT_OPTS;
}

function classifyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/ssl|tls|certificate|tlsv1/i.test(msg)) {
    return (
      "[mongo] TLS/SSL error — Atlas rejected the connection.\n" +
      "  → Go to Atlas → Network Access → Add IP Address → 0.0.0.0/0\n" +
      "  → Verify MONGODB_URI uses mongodb+srv:// (not mongodb://127...)\n" +
      `  → Original error: ${msg}`
    );
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/.test(msg)) {
    return `[mongo] Network error — cannot reach MongoDB host. ${msg}`;
  }
  return `[mongo] Connection failed: ${msg}`;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;
  if (client) return client;
  if (!connecting) {
    connecting = MongoClient.connect(uri, connectionOptions())
      .then((c) => {
        client = c;
        return c as MongoClient | null;
      })
      .catch((err) => {
        // Reset so the next request gets a fresh attempt (don't cache failures).
        connecting = null;
        console.error(classifyError(err));
        return null;
      });
  }
  return connecting;
}

export async function getMongoDb(): Promise<Db | null> {
  const c = await getMongoClient();
  if (!c) return null;
  const name = process.env.MONGODB_DB?.trim() || "achievhq";
  return c.db(name);
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    connecting = null;
  }
}
