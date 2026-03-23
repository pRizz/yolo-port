import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { IntakeProfileRecord } from "../../persistence/intakeProfile.js";

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

function profilePath(repoRoot: string): string {
  return path.join(repoRoot, ".planning", "yolo-port", "intake-profile.json");
}

export async function readIntakeProfile(options: {
  repoRoot: string;
}): Promise<IntakeProfileRecord | null> {
  return readJsonFile<IntakeProfileRecord>(profilePath(options.repoRoot));
}

export async function writeIntakeProfile(options: {
  profile: IntakeProfileRecord;
  repoRoot: string;
}): Promise<string> {
  const destination = profilePath(options.repoRoot);
  await mkdir(path.dirname(destination), {
    recursive: true
  });

  const tempPath = `${destination}.tmp`;
  await writeFile(`${tempPath}`, JSON.stringify(options.profile, null, 2));
  await rename(tempPath, destination);

  return path.relative(options.repoRoot, destination);
}
