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
    expect(output).toContain("Use `yolo-port bootstrap` to start the guided setup flow.");
    expect(output).toContain("yolo-port bootstrap --dry-run");
  });
});
