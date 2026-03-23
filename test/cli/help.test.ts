import { describe, expect, test } from "bun:test";

import { buildCommandRegistry } from "../../src/cli/router.js";
import { renderHelp } from "../../src/ui/help.js";

describe("renderHelp", () => {
  test("lists the explicit day-one subcommands", () => {
    // Arrange
    const registry = buildCommandRegistry();

    // Act
    const output = renderHelp(registry);

    // Assert
    expect(output).toContain("bootstrap");
    expect(output).toContain("resume");
    expect(output).toContain("audit");
    expect(output).toContain("doctor");
  });

  test("keeps bootstrap positioned as the guided entrypoint", () => {
    // Arrange
    const registry = buildCommandRegistry();

    // Act
    const output = renderHelp(registry);

    // Assert
    expect(output).toContain("Run `yolo-port` inside a repo or `yolo-port <repo-url>` to start intake.");
    expect(output).toContain("Use `yolo-port bootstrap` when you want the explicit setup command.");
    expect(output).toContain("yolo-port https://github.com/example/service --dry-run");
    expect(output).toContain("yolo-port --mode yolo --target-stack rust/axum");
    expect(output).toContain("yolo-port bootstrap --dry-run");
  });
});
