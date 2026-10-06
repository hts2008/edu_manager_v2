import { ApiError } from "./api-utils.js";

export type PlatformOwnerActor = {
  isPlatformOwner?: unknown;
};

export function assertPlatformOwner(
  actor: PlatformOwnerActor,
): asserts actor is PlatformOwnerActor & { isPlatformOwner: true } {
  if (actor.isPlatformOwner !== true) {
    throw new ApiError(
      "PLATFORM_OWNER_REQUIRED",
      "Platform owner access required",
      403,
    );
  }
}
