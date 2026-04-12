import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

import type { ManagedRepoState } from "../../persistence/managedRepoState.js";
import type {
  BootstrapStateRecord,
  PlanningManifest
} from "../../persistence/bootstrapState.js";

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  if (!(await exists(filePath))) {
    return null;
  }

  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function collectFiles(rootDir: string): Promise<string[]> {
  if (!(await exists(rootDir))) {
    return [];
  }

  const entries = await readdir(rootDir, {
    withFileTypes: true
  });
  const files: string[] = [];

  for (const entry of entries) {
    const currentPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(currentPath)));
      continue;
    }

    files.push(currentPath);
  }

  return files;
}

export async function readManagedRepoState(options: {
  repoRoot: string;
}): Promise<ManagedRepoState> {
  const planningDir = path.join(options.repoRoot, ".planning");
  const yoloPortDir = path.join(planningDir, "yolo-port");
  const planningFiles = await collectFiles(planningDir);
  const yoloPortFiles = await collectFiles(yoloPortDir);

  const manifest = await readJsonFile<PlanningManifest>(path.join(yoloPortDir, "manifest.json"));
  const bootstrapState = await readJsonFile<BootstrapStateRecord>(
    path.join(yoloPortDir, "bootstrap-state.json")
  );

  const sourceReferencePaths = yoloPortFiles.filter((filePath) =>
    /source-reference/i.test(path.basename(filePath))
  );
  const parityArtifactPaths = [
    ...yoloPortFiles.filter((filePath) => /parity/i.test(path.basename(filePath))),
    ...planningFiles.filter(
      (filePath) =>
        filePath.includes(`${path.sep}05-`) &&
        filePath.endsWith("-VERIFICATION.md")
    )
  ];
  const finalReportPaths = [
    ...yoloPortFiles.filter((filePath) =>
      /final-(report|summary)/i.test(path.basename(filePath))
    ),
    ...planningFiles.filter(
      (filePath) =>
        filePath.includes(`${path.sep}05-`) &&
        filePath.endsWith("-SUMMARY.md")
    )
  ];
  const explicitCompletedStatePath =
    yoloPortFiles.find((filePath) => /port-state|run-state|completed/i.test(path.basename(filePath))) ??
    null;

  return {
    bootstrapState,
    explicitCompletedStatePath,
    finalReportPaths,
    manifest,
    parityArtifactPaths,
    recentSummaryPaths: [
      ...finalReportPaths,
      ...yoloPortFiles.filter((filePath) =>
        /execution-summary/i.test(path.basename(filePath))
      ),
      ...planningFiles.filter((filePath) => filePath.endsWith("-SUMMARY.md"))
    ],
    sourceReferencePaths,
    yoloPortDir: (await exists(yoloPortDir)) ? yoloPortDir : null
  };
}
