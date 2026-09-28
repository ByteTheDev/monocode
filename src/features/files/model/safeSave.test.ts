import { describe, expect, it, vi } from "vitest";
import {
  assertFileUnchanged,
  ExternalFileChangeError,
  writeTextFileIfUnchanged,
} from "./safeSave";

describe("safe file saves", () => {
  it("does not overwrite an external edit made while formatting is running", async () => {
    let disk = "const answer=1;\n";
    let finishFormatting!: (value: string) => void;
    const formatting = new Promise<string>((resolve) => {
      finishFormatting = resolve;
    });
    const writeFile = vi.fn(async (_path: string, content: string) => {
      disk = content;
    });
    const readFile = vi.fn(async () => disk);
    const expectedDiskContent = disk;

    const save = (async () => {
      await assertFileUnchanged(
        "/repo/example.ts",
        expectedDiskContent,
        readFile,
      );

      const formatted = await formatting;

      await writeTextFileIfUnchanged(
        "/repo/example.ts",
        expectedDiskContent,
        formatted,
        { readFile, writeFile },
      );
    })();

    // Simulate an external editor updating the file while formatting is pending.
    disk = "const answer = 2; // external edit\n";
    finishFormatting("const answer = 1;\n");

    await expect(save).rejects.toBeInstanceOf(ExternalFileChangeError);
    expect(writeFile).not.toHaveBeenCalled();
    expect(disk).toBe("const answer = 2; // external edit\n");
  });

  it("writes when the disk still matches the editor baseline", async () => {
    let disk = "before\n";
    const writeFile = vi.fn(async (_path: string, content: string) => {
      disk = content;
    });
    const readFile = vi.fn(async () => disk);

    await writeTextFileIfUnchanged(
      "/repo/example.ts",
      "before\n",
      "after\n",
      { readFile, writeFile },
    );

    expect(writeFile).toHaveBeenCalledOnce();
    expect(disk).toBe("after\n");
  });
});