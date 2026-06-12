import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { asyncCopy, eduFlowTokens } from "../frontend/src/design/tokens.js";
import { getModalMotion, getMotionTransition, getPageMotion } from "../frontend/src/design/motion.js";

describe("EduFlow motion tokens", () => {
  it("uses short opacity-only reduced page motion", () => {
    const pageMotion = getPageMotion(true);
    const modalMotion = getModalMotion(true);

    assert.deepEqual(pageMotion.initial, { opacity: 0 });
    assert.deepEqual(pageMotion.animate, { opacity: 1 });
    assert.deepEqual(modalMotion.initial, { opacity: 0 });
    assert.deepEqual(modalMotion.animate, { opacity: 1 });
    assert.equal(getMotionTransition({ reduced: true }).duration, 0.08);
  });

  it("keeps loading copy and timing tokens explicit", () => {
    assert.equal(asyncCopy.route.length > 0, true);
    assert.equal(asyncCopy.table.length > 0, true);
    assert.equal(eduFlowTokens.loading.longOperationMs, 8000);
  });
});
