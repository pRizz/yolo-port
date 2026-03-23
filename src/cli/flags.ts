import type { BootstrapMode, Verbosity } from "../domain/bootstrap/types.js";

export type ParsedBootstrapFlags = {
  maybeAskTasteQuestions: boolean | null;
  assumeYes: boolean;
  maybeCloneDestination: string | null;
  dryRun: boolean;
  forceBrightBuilds: boolean;
  maybeMode: BootstrapMode | null;
  maybePreferredAgent: string | null;
  maybeRepoUrl: string | null;
  maybeTargetStack: string | null;
  verbosity: Verbosity;
};

function parseMode(value: string): BootstrapMode {
  if (value === "guided" || value === "standard" || value === "yolo") {
    return value;
  }

  throw new Error(`Unsupported bootstrap mode: ${value}`);
}

export function parseBootstrapArgs(argv: string[]): ParsedBootstrapFlags {
  let maybeAskTasteQuestions: boolean | null = null;
  let maybeMode: BootstrapMode | null = null;
  let maybeCloneDestination: string | null = null;
  let maybePreferredAgent: string | null = null;
  let maybeRepoUrl: string | null = null;
  let maybeTargetStack: string | null = null;
  let verbosity: Verbosity = "normal";
  let assumeYes = false;
  let dryRun = false;
  let forceBrightBuilds = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token) {
      continue;
    }

    if (token === "--yes" || token === "-y") {
      assumeYes = true;
      continue;
    }

    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (token === "--force") {
      forceBrightBuilds = true;
      continue;
    }

    if (token === "--dest") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a value after --dest");
      }

      maybeCloneDestination = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--dest=")) {
      maybeCloneDestination = token.slice("--dest=".length);
      continue;
    }

    if (token === "--quiet") {
      verbosity = "quiet";
      continue;
    }

    if (token === "--verbose") {
      verbosity = "verbose";
      continue;
    }

    if (token === "--mode") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a value after --mode");
      }

      maybeMode = parseMode(value);
      index += 1;
      continue;
    }

    if (token.startsWith("--mode=")) {
      maybeMode = parseMode(token.slice("--mode=".length));
      continue;
    }

    if (token === "--target-stack") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a value after --target-stack");
      }

      maybeTargetStack = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--target-stack=")) {
      maybeTargetStack = token.slice("--target-stack=".length);
      continue;
    }

    if (token === "--agent") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a value after --agent");
      }

      maybePreferredAgent = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--agent=")) {
      maybePreferredAgent = token.slice("--agent=".length);
      continue;
    }

    if (token === "--ask-taste") {
      maybeAskTasteQuestions = true;
      continue;
    }

    if (token === "--no-taste-questions") {
      maybeAskTasteQuestions = false;
      continue;
    }

    if (!token.startsWith("-") && maybeRepoUrl === null) {
      maybeRepoUrl = token;
      continue;
    }

    throw new Error(`Unsupported bootstrap argument: ${token}`);
  }

  return {
    maybeAskTasteQuestions,
    assumeYes,
    maybeCloneDestination,
    dryRun,
    forceBrightBuilds,
    maybeMode,
    maybePreferredAgent,
    maybeRepoUrl,
    maybeTargetStack,
    verbosity
  };
}
