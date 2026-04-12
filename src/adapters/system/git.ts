import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import type {
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../../domain/intake/types.js";
import {
  createSourceReferenceRecord,
  type SourceReferenceRecord
} from "../../persistence/portPlanning.js";
import type { GitDiffStatsRecord } from "../../persistence/reporting.js";
import type { RepositorySnapshot } from "../fs/repositorySnapshot.js";

type ProcessResult = {
  code: number;
  output: string;
};

async function runProcess(
  file: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<ProcessResult> {
  const child = spawn(file, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const code = await new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (value) => resolve(value ?? 1));
  });

  return {
    code,
    output
  };
}

async function readGitValue(repoRoot: string, args: string[]): Promise<string | null> {
  const result = await runProcess("git", args, {
    cwd: repoRoot
  });

  if (result.code !== 0) {
    return null;
  }

  const value = result.output.trim();
  return value === "" ? null : value;
}

function normalizeRemoteUrl(url: string): {
  normalizedUrl: string;
  owner: string | null;
  provider: "generic" | "github";
  repoName: string;
} {
  if (url.startsWith("git@")) {
    const match = url.match(/^git@([^:]+):(.+)$/);
    const host = match?.[1] ?? "github.com";
    const repoPath = (match?.[2] ?? "").replace(/\.git$/, "");
    const segments = repoPath.split("/").filter(Boolean);
    const repoName = segments.at(-1) ?? repoPath;
    const owner = segments.length > 1 ? segments.at(-2) ?? null : null;

    return {
      normalizedUrl: url,
      owner,
      provider: host === "github.com" ? "github" : "generic",
      repoName
    };
  }

  const parsed = new URL(url);
  const cleanedPath = parsed.pathname.replace(/\/$/, "").replace(/\.git$/, "");
  const segments = cleanedPath.split("/").filter(Boolean);
  const repoName = segments.at(-1) ?? cleanedPath;
  const owner = segments.length > 1 ? segments.at(-2) ?? null : null;

  return {
    normalizedUrl: parsed.toString(),
    owner,
    provider: parsed.hostname === "github.com" ? "github" : "generic",
    repoName
  };
}

async function readExistingPathKind(destination: string): Promise<RemoteRepositoryInspection["existingPathKind"]> {
  try {
    const entry = await stat(destination);
    if (!entry.isDirectory()) {
      return "file";
    }

    const children = await readdir(destination);
    return children.length === 0 ? "empty-directory" : "non-empty-directory";
  } catch {
    return "missing";
  }
}

async function detectDefaultBranch(
  repoUrl: string,
  options: {
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<{ defaultBranch: string | null; warning: string | null }> {
  const result = await runProcess("git", ["ls-remote", "--symref", repoUrl, "HEAD"], {
    env: options.env
  });

  if (result.code !== 0) {
    return {
      defaultBranch: null,
      warning: "Unable to resolve the remote default branch before clone."
    };
  }

  const branch =
    result.output.match(/^ref:\s+refs\/heads\/([^\s]+)\s+HEAD$/m)?.[1] ??
    result.output.match(/^([0-9a-f]+)\s+HEAD$/m)?.[1] ??
    null;

  if (branch && /^[0-9a-f]+$/.test(branch)) {
    return {
      defaultBranch: null,
      warning: null
    };
  }

  return {
    defaultBranch: branch,
    warning: null
  };
}

export async function inspectLocalRepository(options: {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}): Promise<LocalRepositoryInspection> {
  const topLevel = await runProcess("git", ["rev-parse", "--show-toplevel"], {
    cwd: options.cwd,
    env: options.env
  });

  if (topLevel.code !== 0) {
    return {
      cleanliness: "not-a-repo",
      dirtyEntries: [],
      isGitRepo: false,
      repoName: null,
      repoRoot: null,
      trackedChangeCount: 0,
      untrackedCount: 0
    };
  }

  const repoRoot = topLevel.output.trim();
  const status = await runProcess("git", ["status", "--porcelain=v1"], {
    cwd: repoRoot,
    env: options.env
  });
  const dirtyEntries = status.output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    cleanliness: dirtyEntries.length === 0 ? "clean" : "dirty",
    dirtyEntries,
    isGitRepo: true,
    repoName: path.basename(repoRoot),
    repoRoot,
    trackedChangeCount: dirtyEntries.filter((entry) => !entry.startsWith("??")).length,
    untrackedCount: dirtyEntries.filter((entry) => entry.startsWith("??")).length
  };
}

export async function inspectRemoteRepository(options: {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  maybeCloneDestination?: string | null;
  repoUrl: string;
}): Promise<RemoteRepositoryInspection> {
  const normalized = normalizeRemoteUrl(options.repoUrl);
  const cloneDestination = path.resolve(
    options.cwd,
    options.maybeCloneDestination ?? normalized.repoName
  );
  const { defaultBranch, warning } = await detectDefaultBranch(normalized.normalizedUrl, {
    env: options.env
  });

  return {
    cloneDestination,
    defaultBranch,
    existingPathKind: await readExistingPathKind(cloneDestination),
    normalizedUrl: normalized.normalizedUrl,
    originalUrl: options.repoUrl,
    owner: normalized.owner,
    provider: normalized.provider,
    repoName: normalized.repoName,
    warnings: warning ? [warning] : []
  };
}

export async function cloneRemoteRepository(options: {
  destination: string;
  env?: NodeJS.ProcessEnv;
  repoUrl: string;
}): Promise<{ destination: string; output: string }> {
  const result = await runProcess(
    "git",
    ["clone", "--depth", "1", options.repoUrl, options.destination],
    {
      env: options.env
    }
  );

  if (result.code !== 0) {
    throw new Error(result.output.trim() || "Failed to clone the remote repository.");
  }

  return {
    destination: options.destination,
    output: result.output
  };
}

export async function preserveGitSourceReference(options: {
  generatedAt: string;
  maybeTargetStack: string | null;
  repoRoot: string;
  snapshot: Pick<RepositorySnapshot, "files">;
  sourceKind: "local" | "remote";
}): Promise<SourceReferenceRecord> {
  const repoCheck = await runProcess("git", ["rev-parse", "--show-toplevel"], {
    cwd: options.repoRoot
  });
  const manifestSamplePaths = options.snapshot.files
    .map((file) => file.relativePath)
    .sort()
    .slice(0, 10);

  if (repoCheck.code !== 0) {
    return createSourceReferenceRecord({
      generatedAt: options.generatedAt,
      git: {
        branch: null,
        currentHeadSha: null,
        referenceSha: null,
        remotes: [],
        tagName: null
      },
      manifestSamplePaths,
      repoRoot: options.repoRoot,
      sourceKind: options.sourceKind,
      strategy: "filesystem-manifest",
      structuralIntent: {
        parityGoal: "1:1 external interface parity",
        requiresReferenceBeforeExecution: true,
        strategy: "in-place-managed-port",
        targetStack: options.maybeTargetStack
      }
    });
  }

  const tagName = "yolo-port/source-reference";
  const maybeReferenceSha = await readGitValue(options.repoRoot, [
    "rev-parse",
    `refs/tags/${tagName}`
  ]);

  if (!maybeReferenceSha) {
    const tagResult = await runProcess("git", ["tag", tagName, "HEAD"], {
      cwd: options.repoRoot
    });

    if (tagResult.code !== 0) {
      throw new Error(tagResult.output.trim() || "Failed to create the source-reference tag.");
    }
  }

  const remotesResult = await runProcess("git", ["remote", "-v"], {
    cwd: options.repoRoot
  });
  const remotes = Array.from(
    new Set(
      remotesResult.output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/\s+/)[1])
        .filter((value): value is string => Boolean(value))
    )
  );

  return createSourceReferenceRecord({
    generatedAt: options.generatedAt,
    git: {
      branch: await readGitValue(options.repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
      currentHeadSha: await readGitValue(options.repoRoot, ["rev-parse", "HEAD"]),
      referenceSha: await readGitValue(options.repoRoot, ["rev-parse", `refs/tags/${tagName}`]),
      remotes,
      tagName
    },
    manifestSamplePaths,
    repoRoot: options.repoRoot,
    sourceKind: options.sourceKind,
    strategy: "git-tag",
    structuralIntent: {
      parityGoal: "1:1 external interface parity",
      requiresReferenceBeforeExecution: true,
      strategy: "in-place-managed-port",
      targetStack: options.maybeTargetStack
    }
  });
}

export async function readGitDiffStats(options: {
  baseRef: string | null;
  repoRoot: string;
}): Promise<GitDiffStatsRecord | null> {
  if (!options.baseRef) {
    return null;
  }

  const repoCheck = await runProcess("git", ["rev-parse", "--show-toplevel"], {
    cwd: options.repoRoot
  });
  if (repoCheck.code !== 0) {
    return null;
  }

  const baseCheck = await runProcess("git", ["rev-parse", "--verify", options.baseRef], {
    cwd: options.repoRoot
  });
  if (baseCheck.code !== 0) {
    return null;
  }

  const diff = await runProcess(
    "git",
    ["diff", "--numstat", `${options.baseRef}..HEAD`],
    {
      cwd: options.repoRoot
    }
  );

  if (diff.code !== 0) {
    return null;
  }

  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const line of diff.output.split("\n").map((entry) => entry.trim()).filter(Boolean)) {
    const [maybeAdditions, maybeDeletions] = line.split("\t");
    if (!maybeAdditions || !maybeDeletions) {
      continue;
    }

    filesChanged += 1;
    additions += maybeAdditions === "-" ? 0 : Number.parseInt(maybeAdditions, 10);
    deletions += maybeDeletions === "-" ? 0 : Number.parseInt(maybeDeletions, 10);
  }

  return {
    additions,
    baseRef: options.baseRef,
    deletions,
    filesChanged
  };
}
