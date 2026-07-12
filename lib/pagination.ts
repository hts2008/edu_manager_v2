import { ApiError } from "./api-utils.js";

export const DEFAULT_PAGINATION_LIMIT = 100;
export const MAX_PAGINATION_LIMIT = 500;

export interface PaginationQuery {
  limit?: unknown;
  offset?: unknown;
}

export interface Pagination {
  limit: number;
  offset: number;
}

function parseInteger(
  value: unknown,
  field: "limit" | "offset",
  defaultValue: number,
): number {
  if (value === undefined) return defaultValue;

  if (
    typeof value !== "string" ||
    !/^\d+$/.test(value) ||
    (field === "limit" && value === "0")
  ) {
    throw new ApiError(
      "INVALID_PAGINATION",
      `${field} must be ${field === "limit" ? "a positive" : "a non-negative"} integer`,
      400,
    );
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new ApiError(
      "INVALID_PAGINATION",
      `${field} must be ${field === "limit" ? "a positive" : "a non-negative"} integer`,
      400,
    );
  }
  return parsed;
}

export function parsePagination(query: PaginationQuery): Pagination {
  const limit = parseInteger(query.limit, "limit", DEFAULT_PAGINATION_LIMIT);
  const offset = parseInteger(query.offset, "offset", 0);

  return {
    limit: Math.min(limit, MAX_PAGINATION_LIMIT),
    offset,
  };
}
