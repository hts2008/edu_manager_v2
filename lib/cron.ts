import type { VercelRequest } from "./vercel-types.js";

export function isCronRequest(req: VercelRequest) {
  const authorization = req.headers.authorization;
  const authHeader = Array.isArray(authorization) ? authorization[0] : authorization;
  const expected = getCronAuthorization();

  return Boolean(expected && authHeader === expected);
}

export function assertCronRequest(req: VercelRequest) {
  if (!isCronRequest(req)) {
    return false;
  }
  return true;
}

export function getCronAuthorization() {
  return process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
}
