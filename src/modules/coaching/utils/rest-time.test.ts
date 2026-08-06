import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  classifyRestSecondsFieldError,
  formatRestSeconds,
  formatRestTime,
  REST_SECONDS_MAX,
  REST_SECONDS_NEGATIVE_MESSAGE,
  REST_SECONDS_NOT_INTEGER_MESSAGE,
  REST_SECONDS_QUICK_PICKS,
  REST_SECONDS_TOO_LARGE_MESSAGE,
  validateRestSeconds,
} from "./rest-time";

describe("validateRestSeconds (Entrega A0 #1: single seconds contract)", () => {
  test("empty string is valid and means null (no rest specified)", () => {
    assert.deepEqual(validateRestSeconds(""), { valid: true, value: null });
    assert.deepEqual(validateRestSeconds("   "), { valid: true, value: null });
  });

  test("zero is a valid rest value", () => {
    assert.deepEqual(validateRestSeconds("0"), { valid: true, value: 0 });
  });

  for (const seconds of REST_SECONDS_QUICK_PICKS) {
    test(`quick pick ${seconds} is valid`, () => {
      assert.deepEqual(validateRestSeconds(String(seconds)), { valid: true, value: seconds });
    });
  }

  test("REST_SECONDS_MAX itself is valid (inclusive upper bound)", () => {
    assert.deepEqual(validateRestSeconds(String(REST_SECONDS_MAX)), { valid: true, value: REST_SECONDS_MAX });
  });

  test("one above REST_SECONDS_MAX is rejected as too_large", () => {
    assert.deepEqual(validateRestSeconds(String(REST_SECONDS_MAX + 1)), { valid: false, reason: "too_large" });
  });

  test("a negative value is rejected", () => {
    assert.deepEqual(validateRestSeconds("-1"), { valid: false, reason: "negative" });
  });

  test("a decimal value is rejected as not_integer -- seconds must be whole", () => {
    assert.deepEqual(validateRestSeconds("90.5"), { valid: false, reason: "not_integer" });
  });

  test("non-numeric text is rejected as not_integer", () => {
    assert.deepEqual(validateRestSeconds("abc"), { valid: false, reason: "not_integer" });
  });

  test("a value with surrounding whitespace parses correctly", () => {
    assert.deepEqual(validateRestSeconds("  90  "), { valid: true, value: 90 });
  });
});

describe("classifyRestSecondsFieldError (server Zod message -> stable localizable key)", () => {
  test("maps the exact not_integer message", () => {
    assert.equal(classifyRestSecondsFieldError(REST_SECONDS_NOT_INTEGER_MESSAGE), "not_integer");
  });

  test("maps the exact negative message", () => {
    assert.equal(classifyRestSecondsFieldError(REST_SECONDS_NEGATIVE_MESSAGE), "negative");
  });

  test("maps the exact too_large message", () => {
    assert.equal(classifyRestSecondsFieldError(REST_SECONDS_TOO_LARGE_MESSAGE), "too_large");
  });

  test("an unrecognized message classifies as null, never guessed", () => {
    assert.equal(classifyRestSecondsFieldError("Sets are required."), null);
  });

  test("null/undefined input classifies as null", () => {
    assert.equal(classifyRestSecondsFieldError(null), null);
    assert.equal(classifyRestSecondsFieldError(undefined), null);
  });
});

describe("formatRestSeconds (coach-facing display, seconds only -- no unit ambiguity)", () => {
  test("formats a value with a plain seconds suffix", () => {
    assert.equal(formatRestSeconds(90, "N/A"), "90 s");
    assert.equal(formatRestSeconds(0, "N/A"), "0 s");
  });

  test("never converts to minutes, unlike formatRestTime", () => {
    assert.equal(formatRestSeconds(120, "N/A"), "120 s");
    assert.notEqual(formatRestSeconds(120, "N/A"), formatRestTime(120));
  });

  test("null/undefined uses the fallback", () => {
    assert.equal(formatRestSeconds(null, "N/A"), "N/A");
    assert.equal(formatRestSeconds(undefined, "N/A"), "N/A");
  });
});

describe("formatRestTime (unchanged -- still used by the client portal view only)", () => {
  test("still converts to minutes above 60s, exactly as before Entrega A0", () => {
    assert.equal(formatRestTime(90), "1.5 min");
    assert.equal(formatRestTime(120), "2 min");
    assert.equal(formatRestTime(45), "45 sec");
  });
});
