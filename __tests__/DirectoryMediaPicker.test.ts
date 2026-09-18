const mockPickDirectory = jest.fn();

jest.mock("expo-file-system", () => {
  class MockFile {
    name: string;
    size = 128;
    type = "application/octet-stream";
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
      this.name = uri.split("/").at(-1) ?? "";
    }
  }

  class MockDirectory {
    static pickDirectoryAsync = (...args: unknown[]) =>
      mockPickDirectory(...args);

    entries: Array<MockDirectory | MockFile> = [];
    uri: string;

    constructor(uri: string) {
      this.uri = uri;
    }

    list() {
      return this.entries;
    }
  }

  return { Directory: MockDirectory, File: MockFile };
});

import { Directory, File } from "expo-file-system";

import {
    collectDirectoryMediaFiles,
    pickDirectoryMediaFiles,
} from "../src/media/DirectoryMediaPicker";

function directory(uri: string, entries: Array<Directory | File>) {
  const result = new Directory(uri);
  (result as unknown as { entries: Array<Directory | File> }).entries = entries;
  return result;
}

describe("DirectoryMediaPicker", () => {
  beforeEach(() => jest.clearAllMocks());

  it("recursively filters supported files and returns deterministic path order", () => {
    const root = directory("file:///picked", [
      new File("file:///picked/z.MP3"),
      directory("file:///picked/nested", [
        new File("file:///picked/nested/ignore.txt"),
        new File("file:///picked/nested/a.wav"),
      ]),
      new File("file:///picked/b.ogg"),
    ]);

    const files = collectDirectoryMediaFiles(root, (name) =>
      /\.(mp3|ogg|wav)$/i.test(name),
    );

    expect(files.map((file) => file.uri)).toEqual([
      "file:///picked/b.ogg",
      "file:///picked/nested/a.wav",
      "file:///picked/z.MP3",
    ]);
    expect(files[0]).toEqual({
      mimeType: "application/octet-stream",
      name: "b.ogg",
      size: 128,
      uri: "file:///picked/b.ogg",
    });
  });

  it.each(["ERR_PICKER_CANCELLED", "ERR_FILE_PICKING_CANCELLED"])(
    "returns null when the native picker reports %s",
    async (code) => {
      mockPickDirectory.mockRejectedValueOnce(
        Object.assign(new Error("The file picker was cancelled by the user"), {
          code,
        }),
      );

      await expect(pickDirectoryMediaFiles(() => true)).resolves.toBeNull();
    },
  );

  it("returns an empty list when the directory has no supported files", async () => {
    mockPickDirectory.mockResolvedValueOnce(
      directory("file:///picked", [new File("file:///picked/notes.txt")]),
    );

    await expect(
      pickDirectoryMediaFiles((name) => name.endsWith(".mp3")),
    ).resolves.toEqual([]);
  });

  it("propagates unexpected picker and traversal failures", async () => {
    mockPickDirectory.mockRejectedValueOnce(new Error("Permission denied"));
    await expect(pickDirectoryMediaFiles(() => true)).rejects.toThrow(
      "Permission denied",
    );

    const root = directory("file:///picked", []);
    jest.spyOn(root, "list").mockImplementation(() => {
      throw new Error("Directory unavailable");
    });
    mockPickDirectory.mockResolvedValueOnce(root);
    await expect(pickDirectoryMediaFiles(() => true)).rejects.toThrow(
      "Directory unavailable",
    );
  });
});
