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

export function assertStudentProgressDemoDatabase(identity: DemoDatabaseIdentity) {
  if (identity.target !== "preview") {
    throw new Error("Demo data is restricted to a review/preview database");
  }
  if (identity.vercelEnvironment === "production") {
    throw new Error("Demo data cannot run in a production Vercel environment");
  }
  if (PRODUCTION_ENDPOINT_IDS.has(identity.actualEndpoint)) {
    throw new Error("Demo data cannot run against the production Neon endpoint");
  }
  if (!identity.expectedEndpoint?.startsWith("ep-") || !identity.expectedDatabase) {
    throw new Error("Expected preview database identity is required");
  }
  if (
    identity.actualEndpoint !== identity.expectedEndpoint ||
    identity.actualDatabase !== identity.expectedDatabase
  ) {
    throw new Error("Review database identity mismatch");
  }
}
