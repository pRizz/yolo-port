import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  appendManagedExecutionEvent,
  readManagedExecutionState,
  writeManagedExecutionState
} from "../../src/adapters/fs/executionState.js";
import {
  createManagedExecutionEventRecord,
  createManagedExecutionStateRecord
} from "../../src/persistence/executionState.js";

describe("managed execution state persistence", () => {
  test("writes state atomically and appends events without truncating prior entries", async () => {
    // Arrange
    const repoRoot = mkdtempSync(path.join(os.tmpdir(), "yolo-port-execution-state-"));
    const state = createManagedExecutionStateRecord({
      currentStep: null,
      handoffPath: ".planning/yolo-port/execution-handoff.md",
      lastError: null,
      lastRunner: null,
      mode: "yolo",
      outputPath: null,
      repoRoot,
      resumeCommand: "yolo-port resume --yes",
      startedAt: "2026-04-12T01:20:01.688Z",
      status: "ready",
      summaryPath: null,
      updatedAt: "2026-04-12T01:20:01.688Z"
    });

    // Act
    await writeManagedExecutionState({
      repoRoot,
      state
    });
    await appendManagedExecutionEvent({
      event: createManagedExecutionEventRecord({
        at: "2026-04-12T01:20:02.000Z",
        details: "Managed execution started.",
        maybeRunner: null,
        status: "running",
        step: null,
        type: "run-started"
      }),
      repoRoot
    });
    await appendManagedExecutionEvent({
      event: createManagedExecutionEventRecord({
        at: "2026-04-12T01:20:03.000Z",
        details: "prepare-handoff completed.",
        maybeRunner: null,
        status: "running",
        step: "prepare-handoff",
        type: "step-finished"
      }),
      repoRoot
    });
    const loadedState = await readManagedExecutionState({
      repoRoot
    });

    // Assert
    expect(loadedState?.resumeCommand).toBe("yolo-port resume --yes");
    const events = readFileSync(
      path.join(repoRoot, ".planning", "yolo-port", "execution-events.jsonl"),
      "utf8"
    )
      .trim()
      .split("\n");
    expect(events.length).toBe(2);
    expect(events[0]).toContain("run-started");
    expect(events[1]).toContain("prepare-handoff");

    // Cleanup
    rmSync(repoRoot, { force: true, recursive: true });
  });
});
