import { describe, expect, test } from "bun:test";

import {
  isRemoteRepositoryUrl,
  normalizeIntakeRequest
} from "../../../src/domain/intake/normalizeIntake.js";

describe("normalizeIntakeRequest", () => {
  test("routes an empty invocation into bootstrap intake", () => {
    // Act
    const request = normalizeIntakeRequest({
      argv: []
    });

    // Assert
    expect(request).toEqual({
      forwardedArgs: [],
      kind: "bootstrap",
      source: "implicit-default"
    });
  });

  test("treats leading flags as bootstrap intake arguments", () => {
    // Act
    const request = normalizeIntakeRequest({
      argv: ["--dry-run", "--mode", "yolo"]
    });

    // Assert
    expect(request).toEqual({
      forwardedArgs: ["--dry-run", "--mode", "yolo"],
      kind: "bootstrap",
      source: "implicit-default"
    });
  });

  test("keeps explicit bootstrap invocations explicit", () => {
    // Act
    const request = normalizeIntakeRequest({
      argv: ["bootstrap", "--dry-run"]
    });

    // Assert
    expect(request).toEqual({
      forwardedArgs: ["--dry-run"],
      kind: "bootstrap",
      source: "explicit-bootstrap"
    });
  });

  test("routes a remote repository URL into bootstrap intake", () => {
    // Act
    const request = normalizeIntakeRequest({
      argv: ["https://github.com/example/service"]
    });

    // Assert
    expect(request).toEqual({
      forwardedArgs: ["https://github.com/example/service"],
      kind: "bootstrap",
      source: "remote-url"
    });
  });

  test("leaves explicit subcommands alone", () => {
    // Act
    const request = normalizeIntakeRequest({
      argv: ["audit", "--verbose"]
    });

    // Assert
    expect(request).toEqual({
      commandName: "audit",
      forwardedArgs: ["--verbose"],
      kind: "command"
    });
  });
});

describe("isRemoteRepositoryUrl", () => {
  test("supports git ssh and file URLs", () => {
    // Assert
    expect(isRemoteRepositoryUrl("git@github.com:example/service.git")).toBeTruthy();
    expect(isRemoteRepositoryUrl("file:///tmp/service.git")).toBeTruthy();
    expect(isRemoteRepositoryUrl("not-a-url")).toBeFalsy();
  });
});
