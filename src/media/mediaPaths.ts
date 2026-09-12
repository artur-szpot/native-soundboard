import { Directory, File, Paths } from "expo-file-system";

export const AUDIO_MEDIA_DIRECTORY = "media/sounds";

export function resolveManagedAudio(mediaPath: string): File | null {
  if (
    !mediaPath.startsWith(`${AUDIO_MEDIA_DIRECTORY}/`) ||
    mediaPath.includes("..")
  ) {
    return null;
  }
  return new File(Paths.document, mediaPath);
}

export function removeOrphanedAudio(
  referencedPaths: ReadonlySet<string>,
): void {
  const directory = new Directory(Paths.document, AUDIO_MEDIA_DIRECTORY);
  if (!directory.exists) return;

  for (const entry of directory.list()) {
    const mediaPath = `${AUDIO_MEDIA_DIRECTORY}/${entry.name}`;
    if (entry instanceof File && !referencedPaths.has(mediaPath)) {
      entry.delete();
    }
  }
}
