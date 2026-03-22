export type BunDetection = {
  path: string | null;
  status: "missing" | "present";
  version: string | null;
};

type BunGlobal = {
  version?: string;
  which?: (command: string) => string | null | undefined;
};

function readBunGlobal(): BunGlobal | null {
  const maybeBun = (globalThis as typeof globalThis & { Bun?: BunGlobal }).Bun;
  return maybeBun ?? null;
}

export function detectBun(): BunDetection {
  const maybeBun = readBunGlobal();
  if (!maybeBun) {
    return {
      path: null,
      status: "missing",
      version: null
    };
  }

  return {
    path: maybeBun.which?.("bun") ?? "bun",
    status: "present",
    version: maybeBun.version ?? null
  };
}

export function readBunVersion(): string | null {
  return detectBun().version;
}
