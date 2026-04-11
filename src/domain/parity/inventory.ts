import type { RepositorySnapshot } from "../../adapters/fs/repositorySnapshot.js";
import {
  createInterfaceInventoryRecord,
  type InterfaceInventoryItem,
  type InterfaceInventoryRecord
} from "../../persistence/portPlanning.js";

const FLAG_FILE_HINT = /(?:^bin\/|\/bin\/|cli|flag|command|main)/i;
const HTTP_ROUTE_PATTERNS = [
  /\b(?:app|router|server)\.(get|post|put|patch|delete|options|head)\(\s*["'`]([^"'`]+)["'`]/gi,
  /\.route\(\s*["'`]([^"'`]+)["'`]\s*,\s*([^)]+)\)/gi
] as const;
const ENV_VAR_PATTERNS = [
  /process\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  /env!\(\s*["']([A-Z0-9_]+)["']\s*\)/g,
  /std::env::var(?:_os)?\(\s*["']([A-Z0-9_]+)["']\s*\)/g,
  /getenv\(\s*["']([A-Z0-9_]+)["']\s*\)/g
] as const;

function createKindCounts(): InterfaceInventoryRecord["summary"]["byKind"] {
  return {
    "cli-entrypoint": 0,
    "cli-flag": 0,
    "config-file": 0,
    "environment-variable": 0,
    "http-route": 0,
    "package-export": 0
  };
}

function addUniqueItem(
  items: InterfaceInventoryItem[],
  seenKeys: Set<string>,
  item: InterfaceInventoryItem
): void {
  const key = `${item.kind}:${item.label}:${item.sourcePath}`;
  if (seenKeys.has(key)) {
    return;
  }

  seenKeys.add(key);
  items.push(item);
}

function collectCliEntrypoints(snapshot: RepositorySnapshot, items: InterfaceInventoryItem[], seenKeys: Set<string>): void {
  const packageJson = snapshot.files.find((file) => file.relativePath === "package.json");

  if (packageJson?.content) {
    try {
      const parsed = JSON.parse(packageJson.content) as {
        bin?: Record<string, string> | string;
        name?: string;
      };

      if (typeof parsed.bin === "string") {
        addUniqueItem(items, seenKeys, {
          details: `package.json bin -> ${parsed.bin}`,
          kind: "cli-entrypoint",
          label: parsed.name ?? parsed.bin,
          sourcePath: "package.json"
        });
      } else if (parsed.bin) {
        for (const [name, entryPath] of Object.entries(parsed.bin)) {
          addUniqueItem(items, seenKeys, {
            details: `package.json bin -> ${entryPath}`,
            kind: "cli-entrypoint",
            label: name,
            sourcePath: "package.json"
          });
        }
      }
    } catch {
      // Ignore invalid package.json for inventory purposes.
    }
  }

  for (const file of snapshot.files) {
    if (!file.relativePath.startsWith("bin/")) {
      continue;
    }

    addUniqueItem(items, seenKeys, {
      details: "Executable file under bin/",
      kind: "cli-entrypoint",
      label: file.relativePath.replace(/^bin\//, ""),
      sourcePath: file.relativePath
    });
  }
}

function collectCliFlags(snapshot: RepositorySnapshot, items: InterfaceInventoryItem[], seenKeys: Set<string>): void {
  for (const file of snapshot.files) {
    if (!file.content || !FLAG_FILE_HINT.test(file.relativePath)) {
      continue;
    }

    const matches = file.content.match(/--[a-z0-9][a-z0-9-]*/gi) ?? [];
    for (const match of matches) {
      addUniqueItem(items, seenKeys, {
        details: "Detected from CLI-oriented source",
        kind: "cli-flag",
        label: match,
        sourcePath: file.relativePath
      });
    }
  }
}

function collectHttpRoutes(snapshot: RepositorySnapshot, items: InterfaceInventoryItem[], seenKeys: Set<string>): void {
  for (const file of snapshot.files) {
    if (!file.content) {
      continue;
    }

    for (const pattern of HTTP_ROUTE_PATTERNS) {
      let maybeMatch = pattern.exec(file.content);
      while (maybeMatch) {
        if (pattern === HTTP_ROUTE_PATTERNS[0]) {
          const method = maybeMatch[1]?.toUpperCase();
          const route = maybeMatch[2];
          if (method && route) {
            addUniqueItem(items, seenKeys, {
              details: `${method} ${route}`,
              kind: "http-route",
              label: `${method} ${route}`,
              sourcePath: file.relativePath
            });
          }
        } else {
          const route = maybeMatch[1];
          const handler = maybeMatch[2]?.toUpperCase() ?? "ROUTE";
          if (route) {
            addUniqueItem(items, seenKeys, {
              details: `${handler} ${route}`,
              kind: "http-route",
              label: `${handler} ${route}`,
              sourcePath: file.relativePath
            });
          }
        }

        maybeMatch = pattern.exec(file.content);
      }
      pattern.lastIndex = 0;
    }

    const nextAppApiMatch = file.relativePath.match(/^app\/api\/(.+)\/route\.(?:ts|js)$/);
    if (nextAppApiMatch) {
      const routePath = `/${nextAppApiMatch[1]}`;
      const methods = Array.from(
        new Set(file.content.match(/\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g) ?? ["GET"])
      );

      for (const method of methods) {
        addUniqueItem(items, seenKeys, {
          details: `${method} ${routePath} (file-based route)`,
          kind: "http-route",
          label: `${method} ${routePath}`,
          sourcePath: file.relativePath
        });
      }
    }
  }
}

function collectEnvironmentVariables(
  snapshot: RepositorySnapshot,
  items: InterfaceInventoryItem[],
  seenKeys: Set<string>
): void {
  for (const file of snapshot.files) {
    if (!file.content) {
      continue;
    }

    for (const pattern of ENV_VAR_PATTERNS) {
      let maybeMatch = pattern.exec(file.content);
      while (maybeMatch) {
        const variableName = maybeMatch[1];
        if (variableName) {
          addUniqueItem(items, seenKeys, {
            details: "Read from source during static analysis",
            kind: "environment-variable",
            label: variableName,
            sourcePath: file.relativePath
          });
        }

        maybeMatch = pattern.exec(file.content);
      }
      pattern.lastIndex = 0;
    }
  }
}

function isConfigFile(relativePath: string): boolean {
  const basename = relativePath.split("/").at(-1) ?? relativePath;

  return (
    basename === ".env.example" ||
    basename === ".env.sample" ||
    basename === "Cargo.toml" ||
    basename === "Dockerfile" ||
    basename === "package.json" ||
    basename === "tsconfig.json" ||
    basename.startsWith("Dockerfile.") ||
    basename.endsWith(".config.js") ||
    basename.endsWith(".config.ts") ||
    basename.endsWith(".config.cjs") ||
    basename.endsWith(".config.mjs") ||
    basename.endsWith(".config.json") ||
    relativePath.startsWith("config/") ||
    relativePath.includes("/config/")
  );
}

function collectConfigFiles(snapshot: RepositorySnapshot, items: InterfaceInventoryItem[], seenKeys: Set<string>): void {
  for (const file of snapshot.files) {
    if (!isConfigFile(file.relativePath)) {
      continue;
    }

    addUniqueItem(items, seenKeys, {
      details: "Config or manifest file detected in the source tree",
      kind: "config-file",
      label: file.relativePath,
      sourcePath: file.relativePath
    });
  }
}

function collectPackageExports(snapshot: RepositorySnapshot, items: InterfaceInventoryItem[], seenKeys: Set<string>): void {
  const packageJson = snapshot.files.find((file) => file.relativePath === "package.json");
  if (!packageJson?.content) {
    return;
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      exports?: Record<string, string | Record<string, string>>;
      main?: string;
      module?: string;
    };

    for (const field of ["main", "module"] as const) {
      const value = parsed[field];
      if (!value) {
        continue;
      }

      addUniqueItem(items, seenKeys, {
        details: `package.json ${field} -> ${value}`,
        kind: "package-export",
        label: field,
        sourcePath: "package.json"
      });
    }

    for (const [exportName, exportValue] of Object.entries(parsed.exports ?? {})) {
      addUniqueItem(items, seenKeys, {
        details:
          typeof exportValue === "string"
            ? `package.json exports -> ${exportValue}`
            : `package.json exports keys -> ${Object.keys(exportValue).join(", ")}`,
        kind: "package-export",
        label: exportName,
        sourcePath: "package.json"
      });
    }
  } catch {
    // Ignore invalid package.json for inventory purposes.
  }
}

export function buildInterfaceInventory(input: {
  generatedAt: string;
  snapshot: RepositorySnapshot;
}): InterfaceInventoryRecord {
  const items: InterfaceInventoryItem[] = [];
  const seenKeys = new Set<string>();

  collectCliEntrypoints(input.snapshot, items, seenKeys);
  collectCliFlags(input.snapshot, items, seenKeys);
  collectHttpRoutes(input.snapshot, items, seenKeys);
  collectEnvironmentVariables(input.snapshot, items, seenKeys);
  collectConfigFiles(input.snapshot, items, seenKeys);
  collectPackageExports(input.snapshot, items, seenKeys);

  const byKind = createKindCounts();
  for (const item of items) {
    byKind[item.kind] += 1;
  }

  return createInterfaceInventoryRecord({
    generatedAt: input.generatedAt,
    items: items.sort((left, right) =>
      `${left.kind}:${left.label}:${left.sourcePath}`.localeCompare(
        `${right.kind}:${right.label}:${right.sourcePath}`
      )
    ),
    summary: {
      byKind,
      configFileCount: byKind["config-file"],
      dependencyCount: input.snapshot.dependencyCount,
      detectedLanguages: input.snapshot.detectedLanguages,
      sourceFileCount: input.snapshot.sourceFileCount,
      totalInterfaces: items.length,
      totalLines: input.snapshot.totalLines
    }
  });
}
