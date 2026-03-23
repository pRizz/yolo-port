import readline from "node:readline/promises";

import type { ParsedBootstrapFlags } from "../flags.js";
import type { IntakeProfileRecord } from "../../persistence/intakeProfile.js";
import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import type { IntakeAnswers, RemoteRepositoryInspection } from "../../domain/intake/types.js";

export type PromptIO = {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
};

export type BootstrapPreferenceAnswers = Partial<IntakeAnswers> & {
  maybeMode?: BootstrapMode | null;
};

async function askQuestion(io: PromptIO, question: string): Promise<string | null> {
  if (!io.input.isTTY || !io.output.isTTY) {
    return null;
  }

  const prompt = readline.createInterface({
    input: io.input,
    output: io.output
  });
  const answer = await prompt.question(question);
  prompt.close();

  return answer.trim();
}

export async function resolveMode(input: {
  assumeYes: boolean;
  initialMode: BootstrapMode | null;
  io: PromptIO;
}): Promise<BootstrapMode> {
  if (input.initialMode) {
    return input.initialMode;
  }

  if (input.assumeYes || !input.io.input.isTTY || !input.io.output.isTTY) {
    return "guided";
  }

  const maybeAnswer = await askQuestion(
    input.io,
    "How involved do you want to be? [guided/standard/yolo] (guided): "
  );
  const normalized = maybeAnswer?.toLowerCase() ?? "";

  if (normalized === "standard" || normalized === "yolo") {
    return normalized;
  }

  return "guided";
}

export async function promptText(
  io: PromptIO,
  question: string
): Promise<string | null> {
  const maybeAnswer = await askQuestion(io, question);

  if (!maybeAnswer) {
    return null;
  }

  return maybeAnswer;
}

export async function promptBoolean(input: {
  defaultValue: boolean;
  io: PromptIO;
  question: string;
}): Promise<boolean> {
  const maybeAnswer = await askQuestion(input.io, input.question);

  if (maybeAnswer === null || maybeAnswer === "") {
    return input.defaultValue;
  }

  return maybeAnswer.toLowerCase() === "y" || maybeAnswer.toLowerCase() === "yes";
}

export async function confirmExecution(input: {
  assumeYes: boolean;
  io: PromptIO;
  mode: BootstrapMode;
}): Promise<boolean> {
  if (input.assumeYes || input.mode === "yolo") {
    return true;
  }

  if (!input.io.input.isTTY || !input.io.output.isTTY) {
    return false;
  }

  const maybeAnswer = await askQuestion(
    input.io,
    "Proceed with the planned bootstrap actions? [Y/n] "
  );

  return maybeAnswer === null || maybeAnswer === "" || maybeAnswer.toLowerCase() === "y";
}

export async function confirmCloneIntoExistingDestination(input: {
  inspection: RemoteRepositoryInspection;
  io: PromptIO;
}): Promise<boolean> {
  if (input.inspection.existingPathKind === "missing") {
    return true;
  }

  if (input.inspection.existingPathKind === "file") {
    input.io.output.write(
      `Clone destination exists as a file: ${input.inspection.cloneDestination}. Re-run with --dest to choose another path.\n`
    );
    return false;
  }

  if (input.inspection.existingPathKind === "non-empty-directory") {
    input.io.output.write(
      `Clone destination already exists and is not empty: ${input.inspection.cloneDestination}. Re-run with --dest to choose another path.\n`
    );
    return false;
  }

  if (!input.io.input.isTTY || !input.io.output.isTTY) {
    input.io.output.write(
      `Clone destination already exists: ${input.inspection.cloneDestination}. Re-run interactively or with --dest to confirm a different location.\n`
    );
    return false;
  }

  const maybeAnswer = await askQuestion(
    input.io,
    `Clone destination already exists and is empty. Use ${input.inspection.cloneDestination}? [y/N] `
  );

  return maybeAnswer?.toLowerCase() === "y";
}

export async function confirmForce(io: PromptIO): Promise<boolean> {
  if (!io.input.isTTY || !io.output.isTTY) {
    return false;
  }

  const maybeAnswer = await askQuestion(
    io,
    "Bright Builds reported a blocked repo. Continue with --force replacement? [y/N] "
  );

  return maybeAnswer?.toLowerCase() === "y";
}

export async function confirmDetectedRepoState(input: {
  io: PromptIO;
  state: string;
}): Promise<boolean> {
  if (!input.io.input.isTTY || !input.io.output.isTTY) {
    input.io.output.write(
      `Repository state needs confirmation before yolo-port continues. Re-run interactively to confirm the detected state (${input.state}).\n`
    );
    return false;
  }

  const maybeAnswer = await askQuestion(
    input.io,
    `Proceed using the detected state "${input.state}"? [Y/n] `
  );

  return maybeAnswer === null || maybeAnswer === "" || maybeAnswer.toLowerCase() === "y";
}

export async function collectBootstrapPreferenceAnswers(input: {
  assumeYes: boolean;
  flags: ParsedBootstrapFlags;
  io: PromptIO;
  mode: BootstrapMode;
  savedProfile: IntakeProfileRecord | null;
}): Promise<BootstrapPreferenceAnswers> {
  const currentAnswers: BootstrapPreferenceAnswers = {
    maybeMode: input.mode,
    tasteAnswers: {}
  };

  if (
    !input.flags.maybeTargetStack &&
    !input.savedProfile?.targetStack &&
    input.mode !== "yolo"
  ) {
    currentAnswers.maybeTargetStack = await promptText(
      input.io,
      "Target stack (optional, e.g. rust/axum): "
    );
  }

  if (
    !input.flags.maybePreferredAgent &&
    !input.savedProfile?.preferredAgent &&
    input.mode !== "yolo"
  ) {
    currentAnswers.maybePreferredAgent =
      (await promptText(
        input.io,
        "Preferred agent/provider (codex): "
      )) ?? "codex";
  }

  if (input.flags.maybeAskTasteQuestions !== null) {
    currentAnswers.askTasteQuestions = input.flags.maybeAskTasteQuestions;
  } else if (input.savedProfile) {
    currentAnswers.askTasteQuestions = input.savedProfile.askTasteQuestions;
  } else if (input.mode === "yolo" || input.assumeYes) {
    currentAnswers.askTasteQuestions = false;
  } else {
    currentAnswers.askTasteQuestions = await promptBoolean({
      defaultValue: false,
      io: input.io,
      question: "Answer a few design/taste questions now? [y/N] "
    });
  }

  if (currentAnswers.askTasteQuestions && input.mode !== "yolo") {
    const maybeProfileAnswer = await promptText(
      input.io,
      "Taste profile (defaults/strict/pragmatic) [defaults]: "
    );
    const maybeNotesAnswer = await promptText(
      input.io,
      "Additional taste notes (optional): "
    );

    currentAnswers.tasteAnswers = {
      ...(maybeProfileAnswer ? { profile: maybeProfileAnswer } : { profile: "defaults" }),
      ...(maybeNotesAnswer ? { notes: maybeNotesAnswer } : {})
    };
  }

  return currentAnswers;
}
