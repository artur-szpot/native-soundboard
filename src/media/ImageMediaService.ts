import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { copyAsync } from "expo-file-system/legacy";
import { Image } from "react-native";

import { IMAGE_MEDIA_DIRECTORY, resolveManagedImage } from "./mediaPaths";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 4096;
const STORAGE_RESERVE_BYTES = 5 * 1024 * 1024;
const supportedExtensions = new Set([".jpeg", ".jpg", ".png", ".webp"]);

export function isSupportedImageFilename(filename: string): boolean {
  return supportedExtensions.has(
    filename.slice(filename.lastIndexOf(".")).toLowerCase(),
  );
}

export interface PickedImage {
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
}

export function validatePickedImage(asset: PickedImage, size: number): string {
  const extension = asset.name.slice(asset.name.lastIndexOf(".")).toLowerCase();
  if (!isSupportedImageFilename(asset.name)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }
  if (asset.mimeType && !asset.mimeType.startsWith("image/")) {
    throw new Error("The selected file is not recognized as an image.");
  }
  if (size <= 0) throw new Error("The selected image file is empty.");
  if (size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }
  return extension === ".jpeg" ? ".jpg" : extension;
}

export class ImageMediaService {
  list(): readonly string[] {
    const directory = new Directory(Paths.document, IMAGE_MEDIA_DIRECTORY);
    if (!directory.exists) return [];

    return directory
      .list()
      .filter(
        (entry): entry is File =>
          entry instanceof File && !entry.name.includes(".importing"),
      )
      .map((entry) => `${IMAGE_MEDIA_DIRECTORY}/${entry.name}`)
      .sort();
  }

  async import(asset: PickedImage): Promise<string> {
    const info =
      asset.size === undefined && asset.uri.startsWith("file://")
        ? new File(asset.uri).info()
        : null;
    const size = asset.size ?? info?.size ?? 0;
    const extension = validatePickedImage(asset, size);
    if (info && !info.exists) {
      throw new Error("The selected image is no longer available.");
    }
    if (Paths.availableDiskSpace < size + STORAGE_RESERVE_BYTES) {
      throw new Error(
        "There is not enough device storage to import this image.",
      );
    }

    const dimensions = await Image.getSize(asset.uri);
    if (
      dimensions.width > MAX_IMAGE_DIMENSION ||
      dimensions.height > MAX_IMAGE_DIMENSION
    ) {
      throw new Error("Images must be 4096 by 4096 pixels or smaller.");
    }

    const directory = new Directory(Paths.document, IMAGE_MEDIA_DIRECTORY);
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
      await staged.move(final);
      return `${IMAGE_MEDIA_DIRECTORY}/${final.name}`;
    } catch (error) {
      if (staged.exists) staged.delete();
      if (final.exists) final.delete();
      throw error;
    }
  }

  remove(iconUri: string): void {
    const file = resolveManagedImage(iconUri);
    if (file?.exists) file.delete();
  }
}

export const imageMediaService = new ImageMediaService();
