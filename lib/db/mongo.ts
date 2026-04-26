import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let connecting: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

// On serverless (Netlify/Vercel) each Lambda may reuse a warm module instance,
// so the singleton is still worth keeping — but connections must time out fast
// to avoid hanging the function on a cold Atlas connection.
const SERVERLESS_OPTS = {
  maxPoolSize: 1,          // one connection per Lambda instance is enough
  minPoolSize: 0,          // don't keep idle connections open
  maxIdleTimeMS: 10_000,   // close idle connections after 10 s
  serverSelectionTimeoutMS: 5_000,  // fail fast if Atlas is unreachable
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 10_000,
};

// Docker/Node long-running process: benefit from a larger pool
const PERSISTENT_OPTS = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 30_000,
};

function connectionOptions() {
  // Netlify sets NETLIFY=true; Vercel sets VERCEL=1
  const isServerless =
    process.env.NETLIFY === "true" || Boolean(process.env.VERCEL);
  return isServerless ? SERVERLESS_OPTS : PERSISTENT_OPTS;
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) return null;
  if (client) return client;
  if (!connecting) {
    connecting = MongoClient.connect(uri, connectionOptions()).then((c) => {
      client = c;
      return c;
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
