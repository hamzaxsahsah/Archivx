// Netlify build plugin — validates and prints MongoDB connection details on every deploy.
// Fails the build if a local/Docker URI is detected on a serverless host.

const dns = require("dns").promises;

const LOCAL_PATTERNS = [
  /^127\./,
  /^localhost/i,
  /^0\.0\.0\.0/,
  /^::1$/,
  /^mongodb:\/\/(localhost|127\.|0\.0\.0\.0)/i,
];

function isLocalUri(uri) {
  return LOCAL_PATTERNS.some((re) => re.test(uri));
}

function parseMongoHost(uri) {
  const isSrv = uri.startsWith("mongodb+srv://");
  const scheme = isSrv ? "mongodb+srv://" : "mongodb://";
  const withoutScheme = uri.slice(scheme.length);
  const atIdx = withoutScheme.indexOf("@");
  const afterCreds = atIdx >= 0 ? withoutScheme.slice(atIdx + 1) : withoutScheme;
  const hostPart = afterCreds.split("/")[0].split("?")[0];
  if (!isSrv) {
    const firstHost = hostPart.split(",")[0];
    const portIdx = firstHost.lastIndexOf(":");
    return { isSrv, host: portIdx > 0 ? firstHost.slice(0, portIdx) : firstHost };
  }
  return { isSrv, host: hostPart };
}

async function resolveHosts(isSrv, host) {
  const lines = [];
  if (isSrv) {
    let srvRecords = null;
    try {
      srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    } catch { /* fallback below */ }
    if (srvRecords && srvRecords.length > 0) {
      for (const rec of srvRecords.slice(0, 4)) {
        try {
          const ips = await dns.resolve4(rec.name);
          lines.push(`  shard  ${rec.name}:${rec.port}  →  ${ips.join(", ")}`);
        } catch {
          lines.push(`  shard  ${rec.name}:${rec.port}  →  (DNS A lookup failed)`);
        }
      }
      return lines;
    }
  }
  try {
    const ips = await dns.resolve4(host);
    lines.push(`  host   ${host}  →  ${ips.join(", ")}`);
  } catch {
    try {
      const ips6 = await dns.resolve6(host);
      lines.push(`  host   ${host}  →  ${ips6.join(", ")}`);
    } catch {
      lines.push(`  host   ${host}  →  (DNS lookup failed)`);
    }
  }
  return lines;
}

module.exports = {
  async onPreBuild({ utils }) {
    const uri = process.env.MONGODB_URI?.trim();
    const sep = "─".repeat(58);

    console.log(`\n${sep}`);
    console.log("  MongoDB status");
    console.log(sep);

    if (!uri) {
      console.log("  ⚠  MONGODB_URI is not set.");
      console.log("     App will run on Firestore only (no cache layer).");
      console.log("     To add MongoDB Atlas:");
      console.log("       Netlify dashboard → Integrations → MongoDB Atlas");
      console.log(`${sep}\n`);
      return; // optional — do not fail the build
    }

    // Detect local/Docker URIs — they will never work on serverless
    if (isLocalUri(uri)) {
      utils.build.failBuild(
        [
          "",
          sep,
          "  ✗  MONGODB_URI points to a local / Docker address.",
          `     Detected: ${uri.replace(/:\/\/[^@]*@/, "://<redacted>@")}`,
          "",
          "  Netlify is serverless — there is no MongoDB process at 127.0.0.1.",
          "  Every DB call would time out and slow every request by 5 seconds.",
          "",
          "  Fix — use MongoDB Atlas (free M0 cluster):",
          "    1. https://www.mongodb.com/atlas  →  create a free cluster",
          "    2. Cluster → Connect → Drivers → copy the mongodb+srv:// URI",
          "    3. Netlify dashboard → Site → Environment variables",
          "       Set MONGODB_URI = mongodb+srv://user:pass@cluster.mongodb.net/achievhq",
          "    4. Redeploy.",
          "",
          "  Or remove MONGODB_URI entirely to run on Firestore only.",
          sep,
        ].join("\n"),
      );
      return;
    }

    let parsed;
    try {
      parsed = parseMongoHost(uri);
    } catch (err) {
      utils.build.failPlugin(`mongo-status: could not parse MONGODB_URI — ${err.message}`);
      return;
    }

    const { isSrv, host } = parsed;
    const dbName = process.env.MONGODB_DB?.trim() || "achievhq";

    console.log(`  ✓  MONGODB_URI is set`);
    console.log(`  type    ${isSrv ? "Atlas / SRV (mongodb+srv)" : "Standalone / replica set"}`);
    console.log(`  cluster ${host}`);
    console.log(`  db      ${dbName}`);
    console.log("");

    const hostLines = await resolveHosts(isSrv, host);
    for (const line of hostLines) console.log(line);
    console.log(`${sep}\n`);
  },
};
