// Netlify build plugin — prints MongoDB Atlas connection details (host + IPs)
// on every deploy so you can confirm which cluster the app is pointing at.
// MongoDB is optional in this project: missing MONGODB_URI logs a warning only.

const dns = require("dns").promises;

function parseMongoHost(uri) {
  const isSrv = uri.startsWith("mongodb+srv://");
  const scheme = isSrv ? "mongodb+srv://" : "mongodb://";
  const withoutScheme = uri.slice(scheme.length);
  const atIdx = withoutScheme.indexOf("@");
  const afterCreds = atIdx >= 0 ? withoutScheme.slice(atIdx + 1) : withoutScheme;
  // strip /dbname and ?querystring
  const hostPart = afterCreds.split("/")[0].split("?")[0];
  // for non-srv, take first host and strip port
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
    // Atlas SRV record expands to the actual shard hostnames
    let srvRecords = null;
    try {
      srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    } catch {
      // fallback: resolve the SRV hostname itself
    }
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
    // no SRV — fall through to A record
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

    const sep = "─".repeat(56);
    console.log(`\n${sep}`);
    console.log("  MongoDB status");
    console.log(sep);

    if (!uri) {
      console.log("  ⚠  MONGODB_URI is not set.");
      console.log("     The app will run using Firestore only (no cache layer).");
      console.log("     To enable MongoDB Atlas:");
      console.log("       1. Netlify dashboard → Integrations → MongoDB Atlas");
      console.log("       2. Connect your Atlas cluster — MONGODB_URI is injected");
      console.log("          automatically into this site's environment variables.");
      console.log(`${sep}\n`);
      return; // MongoDB is optional — do not fail the build
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
