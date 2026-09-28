import {
  readTextFile,
  writeTextFile,
} from "../../../platform/tauri/fs";

export class ExternalFileChangeError extends Error {
  constructor(path: string) {
    super(`File changed on disk before save: ${path}`);
    this.name = "ExternalFileChangeError";
  }
}

type ReadTextFile = (path: string) => Promise<string>;
type WriteTextFile = (path: string, content: string) => Promise<void>;

export async function assertFileUnchanged(
  path: string,
  expectedDiskContent: string,
  readFile: ReadTextFile = readTextFile,
): Promise<void> {
  const currentDiskContent = await readFile(path);
  if (currentDiskContent !== expectedDiskContent) {
    throw new ExternalFileChangeError(path);
  }
}

export async function writeTextFileIfUnchanged(
  path: string,
  expectedDiskContent: string,
  content: string,
  io: { readFile?: ReadTextFile; writeFile?: WriteTextFile } = {},
): Promise<void> {
  const readFile = io.readFile ?? readTextFile;
  const writeFile = io.writeFile ?? writeTextFile;

  // Formatting is asynchronous, so this second check intentionally happens
  // immediately before the write. An external edit that lands while formatting
  // is running must abort autosave instead of being overwritten.
  await assertFileUnchanged(path, expectedDiskContent, readFile);
  await writeFile(path, content);
}