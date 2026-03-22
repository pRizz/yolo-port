import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BootstrapMode } from "../../domain/bootstrap/types.js";
import {
  createBootstrapStateRecord,
  createPlanningManifest
} from "../../persistence/bootstrapState.js";

export type PlanningScaffoldResult = {
  preserved: string[];
  written: string[];
};

const HUMAN_TEMPLATE_FILES = [
  "PROJECT.md",
  "ROADMAP.md",
  "STATE.md",
  "REQUIREMENTS.md",
  "config.json"
] as const;

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readTemplate(name: string): Promise<string> {
  const templateUrl = new URL(`../../templates/planning/${name}`, import.meta.url);
  return readFile(templateUrl, "utf8");
}

function renderTemplate(template: string, replacements: Record<string, string>): string {
  return Object.entries(replacements).reduce(
    (current, [key, value]) => current.replaceAll(`{{${key}}}`, value),
    template
  );
}

export async function writePlanningScaffold(input: {
  executedSteps: string[];
  mode: BootstrapMode;
  projectName: string;
  repoRoot: string;
  updatedAt: string;
  warnings: string[];
}): Promise<PlanningScaffoldResult> {
  const planningDir = path.join(input.repoRoot, ".planning");
  const written: string[] = [];
  const preserved: string[] = [];

  await mkdir(planningDir, { recursive: true });

  for (const fileName of HUMAN_TEMPLATE_FILES) {
    const destination = path.join(planningDir, fileName);
    if (await exists(destination)) {
      preserved.push(path.relative(input.repoRoot, destination));
      continue;
    }

    const template = await readTemplate(fileName === "config.json" ? "config.json.tpl" : `${fileName}.tpl`);
    const content = renderTemplate(template, {
      DATE: input.updatedAt.slice(0, 10),
      MODE_JSON: JSON.stringify(input.mode),
      PROJECT_NAME: input.projectName
    });

    await writeFile(destination, content);
    written.push(path.relative(input.repoRoot, destination));
  }

  const machineDir = path.join(planningDir, "yolo-port");
  await mkdir(machineDir, { recursive: true });

  const manifest = createPlanningManifest({
    createdAt: input.updatedAt,
    repoRoot: input.repoRoot
  });
  const manifestTemplate = await readTemplate("yolo-port/manifest.json.tpl");
  const manifestContent = renderTemplate(manifestTemplate, {
    CREATED_AT_JSON: JSON.stringify(manifest.createdAt),
    REPO_ROOT_JSON: JSON.stringify(manifest.repoRoot),
    SCHEMA_VERSION_JSON: JSON.stringify(manifest.schemaVersion)
  });

  const bootstrapState = createBootstrapStateRecord({
    executedSteps: input.executedSteps,
    mode: input.mode,
    updatedAt: input.updatedAt,
    warnings: input.warnings,
    writtenArtifacts: written
  });
  const stateTemplate = await readTemplate("yolo-port/bootstrap-state.json.tpl");
  const stateContent = renderTemplate(stateTemplate, {
    EXECUTED_STEPS_JSON: JSON.stringify(bootstrapState.executedSteps, null, 2),
    MODE_JSON: JSON.stringify(bootstrapState.mode),
    SCHEMA_VERSION_JSON: JSON.stringify(bootstrapState.schemaVersion),
    UPDATED_AT_JSON: JSON.stringify(bootstrapState.updatedAt),
    WARNINGS_JSON: JSON.stringify(bootstrapState.warnings, null, 2),
    WRITTEN_ARTIFACTS_JSON: JSON.stringify(bootstrapState.writtenArtifacts, null, 2)
  });

  const manifestPath = path.join(machineDir, "manifest.json");
  const bootstrapStatePath = path.join(machineDir, "bootstrap-state.json");
  await writeFile(manifestPath, manifestContent);
  await writeFile(bootstrapStatePath, stateContent);
  written.push(
    path.relative(input.repoRoot, manifestPath),
    path.relative(input.repoRoot, bootstrapStatePath)
  );

  return {
    preserved,
    written
  };
}
