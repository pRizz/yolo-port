import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ManagedExecutionEventRecord,
  ManagedExecutionHandoffRecord,
  ManagedExecutionStateRecord
} from "../../persistence/executionState.js";

export type ManagedExecutionPaths = {
  events: string;
  handoff: string;
  output: string;
  prompt: string;
  state: string;
  summary: string;
};

function executionRoot(repoRoot: string): string {
  return path.join(repoRoot, ".planning", "yolo-port");
}

export function managedExecutionPaths(repoRoot: string): ManagedExecutionPaths {
  const root = executionRoot(repoRoot);

  return {
    events: path.join(root, "execution-events.jsonl"),
    handoff: path.join(root, "execution-handoff.json"),
    output: path.join(root, "execution-output.log"),
    prompt: path.join(root, "execution-handoff.md"),
    state: path.join(root, "execution-state.json"),
    summary: path.join(root, "execution-summary.md")
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), {
    recursive: true
  });

  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, content);
  await rename(tempPath, filePath);
}

export async function appendManagedExecutionEvent(input: {
  event: ManagedExecutionEventRecord;
  repoRoot: string;
}): Promise<string> {
  const filePath = managedExecutionPaths(input.repoRoot).events;
  await mkdir(path.dirname(filePath), {
    recursive: true
  });
  await writeFile(filePath, `${JSON.stringify(input.event)}\n`, {
    flag: "a"
  });

  return path.relative(input.repoRoot, filePath);
}

export async function readManagedExecutionHandoff(options: {
  repoRoot: string;
}): Promise<ManagedExecutionHandoffRecord | null> {
  return readJsonFile<ManagedExecutionHandoffRecord>(managedExecutionPaths(options.repoRoot).handoff);
}

export async function readManagedExecutionPrompt(options: {
  repoRoot: string;
}): Promise<string | null> {
  try {
    return await readFile(managedExecutionPaths(options.repoRoot).prompt, "utf8");
  } catch {
    return null;
  }
}

export async function readManagedExecutionState(options: {
  repoRoot: string;
}): Promise<ManagedExecutionStateRecord | null> {
  return readJsonFile<ManagedExecutionStateRecord>(managedExecutionPaths(options.repoRoot).state);
}

export async function writeManagedExecutionHandoff(input: {
  handoff: ManagedExecutionHandoffRecord;
  prompt: string;
  repoRoot: string;
}): Promise<string[]> {
  const paths = managedExecutionPaths(input.repoRoot);
  await writeAtomic(paths.handoff, JSON.stringify(input.handoff, null, 2));
  await writeAtomic(paths.prompt, `${input.prompt}\n`);

  return [
    path.relative(input.repoRoot, paths.handoff),
    path.relative(input.repoRoot, paths.prompt)
  ];
}

export async function writeManagedExecutionOutput(input: {
  output: string;
  repoRoot: string;
}): Promise<string> {
  const filePath = managedExecutionPaths(input.repoRoot).output;
  await writeAtomic(filePath, input.output);
  return path.relative(input.repoRoot, filePath);
}

export async function writeManagedExecutionState(input: {
  repoRoot: string;
  state: ManagedExecutionStateRecord;
}): Promise<string> {
  const filePath = managedExecutionPaths(input.repoRoot).state;
  await writeAtomic(filePath, JSON.stringify(input.state, null, 2));
  return path.relative(input.repoRoot, filePath);
}

export async function writeManagedExecutionSummary(input: {
  repoRoot: string;
  summary: string;
}): Promise<string> {
  const filePath = managedExecutionPaths(input.repoRoot).summary;
  await writeAtomic(filePath, `${input.summary}\n`);
  return path.relative(input.repoRoot, filePath);
}
