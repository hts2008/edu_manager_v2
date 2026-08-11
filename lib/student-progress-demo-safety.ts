const PRODUCTION_ENDPOINT_IDS = new Set([
  "ep-silent-queen-aoujb3oc",
]);

export type DemoDatabaseIdentity = {
  target?: string;
  vercelEnvironment?: string;
  expectedEndpoint?: string;
  expectedDatabase?: string;
  actualEndpoint: string;
  actualDatabase: string;
};

export function studentProgressDemoEndpointId(databaseUrl: string) {
  const hostname = new URL(databaseUrl).hostname;
  const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
  if (loopbackHosts.has(hostname)) return hostname;
  return (hostname.split(".")[0] || "").replace(/-pooler$/, "");
}

export function assertStudentProgressDemoDatabase(identity: DemoDatabaseIdentity) {
  const safeDatabaseName = /(?:^|[_-])(review|preview|demo|test)(?:$|[_-])/i.test(
    identity.actualDatabase,
  );
  if (identity.target !== "preview" && identity.target !== "local") {
    throw new Error("Demo data is restricted to a review/preview database");
  }
  if (identity.vercelEnvironment === "production") {
    throw new Error("Demo data cannot run in a production Vercel environment");
  }
  if (PRODUCTION_ENDPOINT_IDS.has(identity.actualEndpoint)) {
    throw new Error("Demo data cannot run against the production Neon endpoint");
  }
  if (!safeDatabaseName) {
    throw new Error(
      "Demo data requires a database whose name contains review, preview, demo, or test",
    );
  }
  if (identity.target === "local") {
    const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
    if (!loopbackHosts.has(identity.actualEndpoint)) {
      throw new Error(
        "Local demo data requires a loopback PostgreSQL database",
      );
    }
  } else if (!identity.expectedEndpoint?.startsWith("ep-") || !identity.expectedDatabase) {
    throw new Error("Expected preview database identity is required");
  }
  if (
    identity.actualEndpoint !== identity.expectedEndpoint ||
    identity.actualDatabase !== identity.expectedDatabase
  ) {
    throw new Error("Review database identity mismatch");
  }
}
