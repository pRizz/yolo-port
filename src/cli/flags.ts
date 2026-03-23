import type { BootstrapMode, Verbosity } from "../domain/bootstrap/types.js";

export type ParsedBootstrapFlags = {
  askTasteQuestions: boolean | null;
  assumeYes: boolean;
  cloneDestination: string | null;
  dryRun: boolean;
  forceBrightBuilds: boolean;
  maybeMode: BootstrapMode | null;
  preferredAgent: string | null;
  repoUrl: string | null;
  targetStack: string | null;
  verbosity: Verbosity;
};

function parseMode(value: string): BootstrapMode {
  if (value === "guided" || value === "standard" || value === "yolo") {
    return value;
  }

  throw new Error(`Unsupported bootstrap mode: ${value}`);
}

export function parseBootstrapArgs(argv: string[]): ParsedBootstrapFlags {
  let askTasteQuestions: boolean | null = null;
  let maybeMode: BootstrapMode | null = null;
  let cloneDestination: string | null = null;
  let preferredAgent: string | null = null;
  let repoUrl: string | null = null;
  let targetStack: string | null = null;
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

      cloneDestination = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--dest=")) {
      cloneDestination = token.slice("--dest=".length);
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

      targetStack = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--target-stack=")) {
      targetStack = token.slice("--target-stack=".length);
      continue;
    }

    if (token === "--agent") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Expected a value after --agent");
      }

      preferredAgent = value;
      index += 1;
      continue;
    }

    if (token.startsWith("--agent=")) {
      preferredAgent = token.slice("--agent=".length);
      continue;
    }

    if (token === "--ask-taste") {
      askTasteQuestions = true;
      continue;
    }

    if (token === "--no-taste-questions") {
      askTasteQuestions = false;
      continue;
    }

    if (!token.startsWith("-") && repoUrl === null) {
      repoUrl = token;
      continue;
    }

    throw new Error(`Unsupported bootstrap argument: ${token}`);
  }

  return {
    askTasteQuestions,
    assumeYes,
    cloneDestination,
    dryRun,
    forceBrightBuilds,
    maybeMode,
    preferredAgent,
    repoUrl,
    targetStack,
    verbosity
  };
}
