import { describe, expect, test } from "bun:test";

import { detectBun, readBunVersion } from "../../src/adapters/system/bun.js";

describe("detectBun", () => {
  test("reports Bun as present inside the Bun runtime", () => {
    // Arrange

    // Act
    const detection = detectBun();

    // Assert
    expect(detection.status).toBe("present");
    expect(detection.version).toBeTruthy();
  });

  test("returns the current Bun version", () => {
    // Arrange

    // Act
    const version = readBunVersion();

    // Assert
    expect(version).toBeTruthy();
  });
});
