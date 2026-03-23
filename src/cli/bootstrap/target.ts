import { inspectLocalRepository, inspectRemoteRepository } from "../../adapters/system/git.js";
import type {
  LocalRepositoryInspection,
  RemoteRepositoryInspection
} from "../../domain/intake/types.js";
import type { ParsedBootstrapFlags } from "../flags.js";

export type ResolvedBootstrapTarget =
  | {
      inspection: LocalRepositoryInspection;
      kind: "local";
      repoRoot: string;
    }
  | {
      inspection: RemoteRepositoryInspection;
      kind: "remote";
    };

export async function resolveBootstrapTarget(input: {
  cwd: string;
  flags: ParsedBootstrapFlags;
}): Promise<ResolvedBootstrapTarget> {
  if (input.flags.maybeRepoUrl) {
    return {
      inspection: await inspectRemoteRepository({
        cwd: input.cwd,
        maybeCloneDestination: input.flags.maybeCloneDestination,
        repoUrl: input.flags.maybeRepoUrl
      }),
      kind: "remote"
    };
  }

  const inspection = await inspectLocalRepository({
    cwd: input.cwd
  });

  return {
    inspection,
    kind: "local",
    repoRoot: inspection.repoRoot ?? input.cwd
  };
}
