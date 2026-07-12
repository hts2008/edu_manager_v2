export type AuthConfig = {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: "HS256";
};

let testConfig: AuthConfig | null = null;

export function setAuthConfigForTests(config: AuthConfig | null) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Auth config injection is only available in tests");
  }
  testConfig = config;
}

export function getAuthConfig(): AuthConfig {
  if (testConfig) return validateAuthConfig(testConfig);

  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("JWT_SECRET is required");
  }

  return validateAuthConfig({
    secret,
    issuer: process.env.JWT_ISSUER?.trim() || "edu-manager-v2",
    audience: process.env.JWT_AUDIENCE?.trim() || "edu-manager-v2-api",
    algorithm: "HS256",
  });
}

function validateAuthConfig(config: AuthConfig): AuthConfig {
  if (config.secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return config;
}
