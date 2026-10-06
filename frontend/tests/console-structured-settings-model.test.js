import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  editorKindForSetting,
  normalizeTrackCatalog,
  rubricColumnTotals,
  settingImpactState,
  validateStructuredSetting,
} from "../src/console/structuredSettingsModel.js";

describe("Admin Console structured settings model", () => {
  it("routes finance settings to purpose-built editors and keeps unknown keys generic", () => {
    assert.equal(editorKindForSetting("finance.chargeable_statuses"), "chargeable-statuses");
    assert.equal(editorKindForSetting("finance.default_session_days"), "weekdays");
    assert.equal(editorKindForSetting("finance.extra_session_policy"), "surcharge-policy");
    assert.equal(editorKindForSetting("finance.bulk_pay_max_lines"), "positive-number");
    assert.equal(editorKindForSetting("finance.bulk_actions_max"), "positive-number");
    assert.equal(editorKindForSetting("finance.unrecognized"), "generic");
  });

  it("routes academic catalog, rubric, and difficulty settings", () => {
    assert.equal(editorKindForSetting("academic.track_catalog"), "track-catalog");
    assert.equal(editorKindForSetting("academic.rubric_base_weights"), "rubric");
    assert.equal(editorKindForSetting("academic.rubric_track_overrides"), "rubric");
    assert.equal(editorKindForSetting("academic.difficulty_weights"), "difficulty-weights");
  });

  it("requires every rubric column to total exactly 100", () => {
    const valid = {
      communicative: {
        listening: 25,
        speaking: 25,
        reading: 15,
        writing: 15,
        homework: 10,
        daily_practice: 10,
        mock_test: 0,
      },
    };
    assert.deepEqual(rubricColumnTotals(valid), { communicative: 100 });
    assert.equal(validateStructuredSetting("academic.rubric_base_weights", valid), "");

    const invalid = { communicative: { ...valid.communicative, listening: 24 } };
    assert.match(validateStructuredSetting("academic.rubric_base_weights", invalid), /100/);
  });

  it("normalizes editable track keyword text without changing the API shape", () => {
    assert.deepEqual(
      normalizeTrackCatalog([
        {
          key: "flyers",
          label: "A2 Flyers",
          cefr: "A2",
          keywords: "flyer, flyers,  A2  ",
          canDo: "Giao tiếp trong tình huống quen thuộc",
        },
      ]),
      [
        {
          key: "flyers",
          label: "A2 Flyers",
          cefr: "A2",
          keywords: ["flyer", "flyers", "A2"],
          canDo: "Giao tiếp trong tình huống quen thuộc",
        },
      ],
    );
  });

  it("describes financial and academic effective-month impact explicitly", () => {
    assert.deepEqual(
      settingImpactState({ impact: "financial", requiresEffectiveMonth: true }),
      {
        tone: "amber",
        title: "Ảnh hưởng tài chính",
        detail: "Giá trị mới chỉ áp dụng từ tháng hiệu lực; dữ liệu đã chốt giữ nguyên snapshot.",
      },
    );
    assert.equal(settingImpactState({ impact: "none" }).tone, "slate");
  });
});
