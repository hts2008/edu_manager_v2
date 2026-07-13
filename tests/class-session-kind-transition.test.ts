import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveReplacementForSessionId } from "../server/api/class-sessions/[id].js";

describe("class session kind transitions", () => {
  it("clears the replacement when a makeup session becomes regular and the field is omitted", () => {
    assert.equal(resolveReplacementForSessionId("regular", undefined, "regular-1"), null);
  });

  it("clears the replacement when a makeup session becomes extra and the field is omitted", () => {
    assert.equal(resolveReplacementForSessionId("extra", undefined, "regular-1"), null);
  });

  it("preserves makeup replacement resolution and required-field validation", () => {
    assert.equal(resolveReplacementForSessionId("makeup", undefined, "regular-1"), "regular-1");
    assert.throws(
      () => resolveReplacementForSessionId("makeup", undefined, null),
      (error: any) => error?.code === "MISSING_FIELD" && error?.status === 400,
    );
  });
});
