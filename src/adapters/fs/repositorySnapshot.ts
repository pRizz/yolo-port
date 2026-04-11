import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export type RepositoryFileSnapshot = {
  content: string | null;
  language: string | null;
  lineCount: number;
  relativePath: string;
  sizeBytes: number;
};

export type RepositorySnapshot = {
  dependencyCount: number;
  detectedLanguages: string[];
  files: RepositoryFileSnapshot[];
  sourceFileCount: number;
  totalLines: number;
};

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".planning",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target"
]);

const MAX_TEXT_FILE_SIZE = 256_000;

function detectLanguage(relativePath: string): string | null {
  const extension = path.extname(relativePath).toLowerCase();

  switch (extension) {
    case ".c":
      return "c";
    case ".cc":
    case ".cpp":
    case ".cxx":
      return "cpp";
    case ".go":
      return "go";
    case ".h":
    case ".hpp":
      return "c-header";
    case ".java":
      return "java";
    case ".js":
    case ".cjs":
    case ".mjs":
      return "javascript";
    case ".json":
      return "json";
    case ".py":
      return "python";
    case ".rs":
      return "rust";
    case ".sh":
      return "shell";
    case ".ts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".yaml":
    case ".yml":
      return "yaml";
    default:
      return null;
  }
}

function isConfigLikePath(relativePath: string): boolean {
  const basename = path.basename(relativePath);

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

function isLikelyText(buffer: Buffer): boolean {
  return !buffer.includes(0);
}

function shouldReadContent(relativePath: string, sizeBytes: number): boolean {
  if (sizeBytes > MAX_TEXT_FILE_SIZE) {
    return false;
  }

  const basename = path.basename(relativePath);
  const extension = path.extname(relativePath).toLowerCase();

  return (
    basename === "package.json" ||
    basename === "Cargo.toml" ||
    basename === ".env.example" ||
    basename === ".env.sample" ||
    extension === ".c" ||
    extension === ".cc" ||
    extension === ".cpp" ||
    extension === ".cxx" ||
    extension === ".go" ||
    extension === ".h" ||
    extension === ".hpp" ||
    extension === ".java" ||
    extension === ".js" ||
    extension === ".json" ||
    extension === ".mjs" ||
    extension === ".cjs" ||
    extension === ".py" ||
    extension === ".rs" ||
    extension === ".sh" ||
    extension === ".ts" ||
    extension === ".tsx" ||
    extension === ".yaml" ||
    extension === ".yml"
  );
}

async function walkRepository(rootDir: string, relativeDir = ""): Promise<RepositoryFileSnapshot[]> {
  const currentDir = path.join(rootDir, relativeDir);
  const entries = await readdir(currentDir, {
    withFileTypes: true
  });
  const files: RepositoryFileSnapshot[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      files.push(...(await walkRepository(rootDir, relativePath)));
      continue;
    }

    const fullPath = path.join(rootDir, relativePath);
    const buffer = await readFile(fullPath);
    const language = detectLanguage(relativePath);
    const shouldDecode = shouldReadContent(relativePath, buffer.byteLength) && isLikelyText(buffer);
    const content = shouldDecode ? buffer.toString("utf8") : null;
    const normalizedPath = relativePath.split(path.sep).join("/");

    files.push({
      content,
      language,
      lineCount: content ? content.split(/\r?\n/).length : 0,
      relativePath: normalizedPath,
      sizeBytes: buffer.byteLength
    });
  }

  return files;
}

function countDependencies(files: RepositoryFileSnapshot[]): number {
  const packageJson = files.find((file) => file.relativePath === "package.json");
  if (!packageJson?.content) {
    return 0;
  }

  try {
    const parsed = JSON.parse(packageJson.content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };

    return [
      parsed.dependencies,
      parsed.devDependencies,
      parsed.optionalDependencies,
      parsed.peerDependencies
    ].reduce((total, dependencyMap) => total + Object.keys(dependencyMap ?? {}).length, 0);
  } catch {
    return 0;
  }
}

export async function scanRepositorySnapshot(options: {
  repoRoot: string;
}): Promise<RepositorySnapshot> {
  const files = await walkRepository(options.repoRoot);
  const detectedLanguages = Array.from(
    new Set(files.map((file) => file.language).filter((value): value is string => value !== null))
  ).sort();

  return {
    dependencyCount: countDependencies(files),
    detectedLanguages,
    files,
    sourceFileCount: files.filter(
      (file) => file.language !== null && !isConfigLikePath(file.relativePath)
    ).length,
    totalLines: files.reduce((total, file) => total + file.lineCount, 0)
  };
}
