import { ApiError } from "./api-utils.js";

type TransactionOptions = {
  isolationLevel?: "Serializable";
  maxWait?: number;
  timeout?: number;
};

type SerializableRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  transactionOptions?: TransactionOptions;
};

export function isPrismaSerializationConflict(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2034",
  );
}

export async function runSerializableTransaction<T>(
  db: any,
  work: (tx: any) => Promise<T>,
  options: SerializableRetryOptions = {},
) {
  const maxAttempts = Math.max(1, options.maxAttempts || 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 20);
  const sleep = options.sleep || ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const transactionOptions = {
    isolationLevel: "Serializable" as const,
    maxWait: 5_000,
    timeout: 15_000,
    ...options.transactionOptions,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await db.$transaction(work, transactionOptions);
    } catch (error) {
      if (!isPrismaSerializationConflict(error)) throw error;
      if (attempt === maxAttempts) {
        throw new ApiError(
          "SERIALIZABLE_TRANSACTION_CONFLICT",
          "The request conflicted with another update; retry the operation",
          503,
          { retryable: true, attempts: maxAttempts },
        );
      }
      const jitterMs = Math.floor(Math.random() * Math.max(1, baseDelayMs));
      await sleep(baseDelayMs * attempt + jitterMs);
    }
  }

  throw new ApiError(
    "SERIALIZABLE_TRANSACTION_CONFLICT",
    "The request conflicted with another update; retry the operation",
    503,
    { retryable: true, attempts: maxAttempts },
  );
}
