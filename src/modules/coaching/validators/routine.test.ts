// Entrega A0 adversarial review, area 1 (state transitions).
//
// This is the fast, pure counterpart to
// supabase/tests/routines-a0-state-transitions.integration.test.ts: it
// proves that routineDraftFormSchema / routineTextImportSchema (the
// schemas backing the generic save and the text-import save) never carry a
// "status" key at all, no matter what a crafted request submits. Zod
// silently strips unrecognized keys by default, so this is the actual
// mechanism that makes update-routine.ts / create-routine.ts /
// create-routine-from-text.ts's "always compute status ourselves,
// server-side" guarantee hold -- there is no client-submitted value to even
// read.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { routineDraftFormSchema, routineTextImportSchema } from "./routine";

const validMetadata = {
  clientId: "11111111-1111-1111-1111-111111111111",
  title: "Push Day",
  notes: "",
  startsOn: "",
  endsOn: "",
};

describe("routineDraftFormSchema never carries a status key (Entrega A0 adversarial review)", () => {
  test("a payload with no status parses fine and has no status key", () => {
    const parsed = routineDraftFormSchema.safeParse(validMetadata);
    assert.equal(parsed.success, true);
    assert.equal("status" in (parsed.data as object), false);
  });

  for (const attemptedStatus of ["active", "archived", "draft", "not-a-real-status"]) {
    test(`a manipulated payload with status="${attemptedStatus}" still parses with no status key at all`, () => {
      const parsed = routineDraftFormSchema.safeParse({ ...validMetadata, status: attemptedStatus });
      assert.equal(parsed.success, true);
      assert.equal(
        "status" in (parsed.data as object),
        false,
        "status must be stripped, not merely rejected/validated",
      );
    });
  }
});

describe("routineTextImportSchema never carries a status key either (Entrega A0 adversarial review)", () => {
  const validImportPayload = {
    ...validMetadata,
    days: [
      {
        dayIndex: 1,
        title: "Day 1",
        exercises: [
          {
            exerciseName: "Bench Press",
            exerciseId: "22222222-2222-2222-2222-222222222222",
            setsText: "4",
            repsText: "8",
            restSeconds: "90",
            notes: "",
          },
        ],
      },
    ],
  };

  test("a manipulated status field on the import payload is stripped, not honored", () => {
    const parsed = routineTextImportSchema.safeParse({ ...validImportPayload, status: "active" });
    assert.equal(parsed.success, true);
    assert.equal("status" in (parsed.data as object), false);
  });
});
