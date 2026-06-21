import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IterationPlanningError,
  planIterationState,
  type VisualDiffReport
} from "../../src/index.js";

const passingDiff: VisualDiffReport = {
  targetPath: "mockups/target.png",
  actualPath: "screenshots/primary.png",
  diffPath: "diffs/primary-diff.png",
  score: 0.99,
  threshold: 0.98,
  passed: true
};

const failingDiff: VisualDiffReport = {
  ...passingDiff,
  score: 0.75,
  passed: false,
  observations: ["Large layout delta."]
};

describe("iteration loop planning", () => {
  it("stops when the primary pass is complete", () => {
    const state = planIterationState({
      runId: "run-pass",
      attempt: 1,
      maxAttempts: 3,
      finalStatus: "passed",
      diffReport: passingDiff,
      diffReportPath: "diffs/primary-report.json",
      screenshotAvailable: true
    });

    assert.equal(state.status, "passed");
    assert.equal(state.nextAttempt, undefined);
    assert.match(state.stopReason ?? "", /passed/);
    assert.equal(state.feedback?.[0]?.retryable, false);
  });

  it("plans the next attempt from visual diff feedback", () => {
    const state = planIterationState({
      runId: "run-retry",
      attempt: 1,
      maxAttempts: 3,
      finalStatus: "failed",
      diffReport: failingDiff,
      diffReportPath: "diffs/primary-report.json",
      screenshotAvailable: true
    });

    assert.equal(state.status, "running");
    assert.equal(state.nextAttempt?.attempt, 2);
    assert.match(state.nextAttempt?.reason ?? "", /below threshold/);
    assert.deepEqual(state.nextAttempt?.feedback.map((item) => item.step), ["diff"]);
  });

  it("stops when retryable diff feedback has a non-retryable screenshot blocker", () => {
    const state = planIterationState({
      runId: "run-blocked",
      attempt: 1,
      maxAttempts: 3,
      finalStatus: "failed",
      diffReport: failingDiff,
      diffReportPath: "diffs/primary-report.json",
      screenshotAvailable: false
    });

    assert.equal(state.status, "failed");
    assert.equal(state.nextAttempt, undefined);
    assert.match(state.stopReason ?? "", /No primary screenshot PNG/);
  });

  it("stops at max attempts without planning another retry", () => {
    const state = planIterationState({
      runId: "run-max",
      attempt: 3,
      maxAttempts: 3,
      finalStatus: "failed",
      diffReport: failingDiff,
      diffReportPath: "diffs/primary-report.json",
      screenshotAvailable: true
    });

    assert.equal(state.status, "failed");
    assert.equal(state.nextAttempt, undefined);
    assert.equal(state.stopReason, "maxAttempts 3 reached.");
  });

  it("rejects invalid feedback", () => {
    assert.throws(
      () =>
        planIterationState({
          runId: "run-invalid",
          finalStatus: "failed",
          diffReport: {
            ...failingDiff,
            score: 1.2
          }
        }),
      IterationPlanningError
    );
  });
});
