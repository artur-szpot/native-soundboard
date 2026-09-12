import {
  AudioMediaService,
    MAX_AUDIO_BYTES,
    validatePickedAudio,
} from "../src/media/AudioMediaService";

const mockCreateAudioPlayer = jest.fn();
const mockCopyAsync = jest.fn();
const mockFile = jest.fn();
const mockDirectory = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (...args: unknown[]) => mockCreateAudioPlayer(...args),
}));
jest.mock("expo-file-system", () => ({
  Directory: (...args: unknown[]) => mockDirectory(...args),
  File: (...args: unknown[]) => mockFile(...args),
  Paths: { document: {}, availableDiskSpace: Number.MAX_SAFE_INTEGER },
}));
jest.mock("expo-file-system/legacy", () => ({
  copyAsync: (...args: unknown[]) => mockCopyAsync(...args),
}));

describe("audio import validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts the configured common audio formats", () => {
    for (const name of [
      "sound.mp3",
      "sound.m4a",
      "sound.aac",
      "sound.wav",
      "sound.ogg",
    ]) {
      expect(validatePickedAudio({ name, uri: "file:///sound" }, 1)).toBe(
        name.slice(name.lastIndexOf(".")),
      );
    }
    expect(
      validatePickedAudio(
        {
          mimeType: "application/ogg",
          name: "sound.ogg",
          uri: "file:///sound",
        },
        1,
      ),
    ).toBe(".ogg");
  });

  it("rejects empty, oversized, and unsupported files", () => {
    expect(() =>
      validatePickedAudio({ name: "sound.mp3", uri: "file:///sound" }, 0),
    ).toThrow("empty");
    expect(() =>
      validatePickedAudio(
        { name: "sound.mp3", uri: "file:///sound" },
        MAX_AUDIO_BYTES + 1,
      ),
    ).toThrow("10 MB");
    expect(() =>
      validatePickedAudio({ name: "sound.flac", uri: "file:///sound" }, 1),
    ).toThrow("MP3");
  });

  it("copies restricted Android picker URIs through the shared-content bridge", async () => {
    const staged = {
      delete: jest.fn(),
      exists: false,
      move: jest.fn(),
      uri: "file:///documents/media/sounds/importing.mp3",
    };
    const final = {
      delete: jest.fn(),
      exists: false,
      name: "imported.mp3",
    };
    mockFile
      .mockImplementationOnce(() => staged)
      .mockImplementationOnce(() => final);
    mockDirectory.mockReturnValue({ create: jest.fn() });
    mockCreateAudioPlayer.mockReturnValue({
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      currentStatus: {
        duration: 10,
        error: null,
        isLoaded: true,
      },
      removeAllListeners: jest.fn(),
      release: jest.fn(),
    });

    await expect(
      new AudioMediaService().import({
        name: "sound.mp3",
        size: 1024,
        uri: "content://documents/sound",
      }),
    ).resolves.toEqual(
      expect.objectContaining({ mediaPath: "media/sounds/imported.mp3" }),
    );
    expect(mockFile).toHaveBeenCalledTimes(2);
    expect(mockCopyAsync).toHaveBeenCalledWith({
      from: "content://documents/sound",
      to: staged.uri,
    });
  });

  it("copies ordinary file URIs with the current File API", async () => {
    const source = { copy: jest.fn() };
    const staged = {
      delete: jest.fn(),
      exists: false,
      move: jest.fn(),
      uri: "file:///documents/media/sounds/importing.mp3",
    };
    const final = {
      delete: jest.fn(),
      exists: false,
      name: "imported.mp3",
    };
    mockFile
      .mockImplementationOnce(() => staged)
      .mockImplementationOnce(() => final)
      .mockImplementationOnce(() => source);
    mockDirectory.mockReturnValue({ create: jest.fn() });
    mockCreateAudioPlayer.mockReturnValue({
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      currentStatus: { duration: 10, error: null, isLoaded: true },
      removeAllListeners: jest.fn(),
      release: jest.fn(),
    });

    await new AudioMediaService().import({
      name: "sound.mp3",
      size: 1024,
      uri: "file:///documents/sound.mp3",
    });

    expect(source.copy).toHaveBeenCalledWith(staged);
    expect(mockCopyAsync).not.toHaveBeenCalled();
  });
});
