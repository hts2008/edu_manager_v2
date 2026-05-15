import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  resetRateLimitBucketsForTests,
} from "../lib/rate-limit.js";

test("rate limiter allows attempts until max and blocks after", () => {
  resetRateLimitBucketsForTests();

  const options = { windowMs: 1000, max: 2, now: 1000 };
  const first = checkRateLimit("login:test", options);
  const second = checkRateLimit("login:test", options);
  const third = checkRateLimit("login:test", options);

  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);
  assert.equal(third.allowed, false);
  assert.equal(third.retryAfterSeconds, 1);
});

test("rate limiter resets after window", () => {
  resetRateLimitBucketsForTests();

  assert.equal(
    checkRateLimit("login:reset", { windowMs: 1000, max: 1, now: 1000 })
      .allowed,
    true
  );
  assert.equal(
    checkRateLimit("login:reset", { windowMs: 1000, max: 1, now: 1001 })
      .allowed,
    false
  );
  assert.equal(
    checkRateLimit("login:reset", { windowMs: 1000, max: 1, now: 2500 })
      .allowed,
    true
  );
});
