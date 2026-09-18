import { createAudioPlayer, type AudioStatus } from "expo-audio";
import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { copyAsync } from "expo-file-system/legacy";

import { AUDIO_MEDIA_DIRECTORY, resolveManagedAudio } from "./mediaPaths";

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 60;
const LOAD_TIMEOUT_MS = 10_000;
const STORAGE_RESERVE_BYTES = 5 * 1024 * 1024;

const supportedExtensions = new Set([".aac", ".m4a", ".mp3", ".ogg", ".wav"]);

export function isSupportedAudioFilename(filename: string): boolean {
  return supportedExtensions.has(
    filename.slice(filename.lastIndexOf(".")).toLowerCase(),
  );
}

export interface PickedAudio {
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
}

export interface ImportedAudio {
  mediaPath: string;
  suggestedName: string;
}

export function validatePickedAudio(asset: PickedAudio, size: number): string {
  const extension = asset.name.slice(asset.name.lastIndexOf(".")).toLowerCase();
  if (!isSupportedAudioFilename(asset.name)) {
    throw new Error("Choose an MP3, M4A, AAC, WAV, or OGG audio file.");
  }
  if (
    asset.mimeType &&
    !asset.mimeType.startsWith("audio/") &&
    asset.mimeType !== "application/ogg" &&
    asset.mimeType !== "application/octet-stream"
  ) {
    throw new Error("The selected file is not recognized as audio.");
  }
  if (size <= 0) {
    throw new Error("The selected audio file is empty.");
  }
  if (size > MAX_AUDIO_BYTES) {
    throw new Error("Audio files must be 10 MB or smaller.");
  }
  return extension;
}

function suggestedName(filename: string): string {
  const extensionIndex = filename.lastIndexOf(".");
  return (extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename)
    .replace(/[_-]+/g, " ")
    .trim();
}

async function validateDecodableAudio(uri: string): Promise<void> {
  const player = createAudioPlayer(uri);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const settle = (result: "resolve" | "reject", error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscription.remove();
        if (result === "resolve") resolve();
        else reject(error);
      };
      const finish = (status: AudioStatus) => {
        if (status.error) {
          settle(
            "reject",
            new Error("The selected file could not be decoded as audio."),
          );
        } else if (status.isLoaded) {
          if (!Number.isFinite(status.duration) || status.duration <= 0) {
            settle(
              "reject",
              new Error("The selected audio has no playable duration."),
            );
          } else if (status.duration > MAX_AUDIO_DURATION_SECONDS) {
            settle("reject", new Error("Audio must be one minute or shorter."));
          } else {
            settle("resolve");
          }
        }
      };
      const subscription = player.addListener("playbackStatusUpdate", finish);
      timer = setTimeout(() => {
        settle(
          "reject",
          new Error("The selected audio took too long to validate."),
        );
      }, LOAD_TIMEOUT_MS);

      Promise.resolve().then(() => finish(player.currentStatus));
    });
  } finally {
    player.removeAllListeners("playbackStatusUpdate");
    player.release();
  }
}

export class AudioMediaService {
  async import(asset: PickedAudio): Promise<ImportedAudio> {
    const info =
      asset.size === undefined && asset.uri.startsWith("file://")
        ? new File(asset.uri).info()
        : null;
    const size = asset.size ?? info?.size ?? 0;
    const extension = validatePickedAudio(asset, size);
    if (info && !info.exists) {
      throw new Error("The selected audio file is no longer available.");
    }
    if (Paths.availableDiskSpace < size + STORAGE_RESERVE_BYTES) {
      throw new Error(
        "There is not enough device storage to import this audio.",
      );
    }

    const directory = new Directory(Paths.document, AUDIO_MEDIA_DIRECTORY);
    directory.create({ idempotent: true, intermediates: true });
    const id = randomUUID();
    const staged = new File(directory, `${id}.importing${extension}`);
    const final = new File(directory, `${id}${extension}`);

    try {
      if (asset.uri.startsWith("content://")) {
        await copyAsync({ from: asset.uri, to: staged.uri });
      } else {
        await new File(asset.uri).copy(staged);
      }
      await validateDecodableAudio(staged.uri);
      await staged.move(final);
      return {
        mediaPath: `${AUDIO_MEDIA_DIRECTORY}/${final.name}`,
        suggestedName: suggestedName(asset.name) || "Imported sound",
      };
    } catch (error) {
      if (staged.exists) staged.delete();
      if (final.exists) final.delete();
      throw error;
    }
  }

  remove(mediaPath: string): void {
    const file = this.resolve(mediaPath);
    if (file?.exists) file.delete();
  }

  resolve(mediaPath: string): File | null {
    return resolveManagedAudio(mediaPath);
  }
}

export const audioMediaService = new AudioMediaService();
