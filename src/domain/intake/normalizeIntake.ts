import type { NormalizedIntakeRequest } from "./types.js";

const EXPLICIT_COMMANDS = new Set(["audit", "bootstrap", "doctor", "resume"]);

export function isRemoteRepositoryUrl(value: string): boolean {
  if (value.startsWith("git@")) {
    return value.includes(":");
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "file:" || parsed.protocol === "https:" || parsed.protocol === "ssh:";
  } catch {
    return false;
  }
}

export function normalizeIntakeRequest(input: {
  argv: string[];
}): NormalizedIntakeRequest {
  const [firstArg, ...rest] = input.argv;

  if (!firstArg) {
    return {
      forwardedArgs: [],
      kind: "bootstrap",
      source: "implicit-default"
    };
  }

  if (firstArg.startsWith("-")) {
    return {
      forwardedArgs: input.argv,
      kind: "bootstrap",
      source: "implicit-default"
    };
  }

  if (firstArg === "bootstrap") {
    return {
      forwardedArgs: rest,
      kind: "bootstrap",
      source: "explicit-bootstrap"
    };
  }

  if (isRemoteRepositoryUrl(firstArg)) {
    return {
      forwardedArgs: input.argv,
      kind: "bootstrap",
      source: "remote-url"
    };
  }

  if (EXPLICIT_COMMANDS.has(firstArg)) {
    return {
      commandName: firstArg,
      forwardedArgs: rest,
      kind: "command"
    };
  }

  return {
    commandName: firstArg,
    forwardedArgs: rest,
    kind: "command"
  };
}
