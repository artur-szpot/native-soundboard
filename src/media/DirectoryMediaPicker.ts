import { Directory, File } from "expo-file-system";

export interface PickedDirectoryFile {
  mimeType?: string;
  name: string;
  size?: number;
  uri: string;
}

type SupportsFilename = (filename: string) => boolean;

export function collectDirectoryMediaFiles(
  directory: Directory,
  supportsFilename: SupportsFilename,
): PickedDirectoryFile[] {
  const files: PickedDirectoryFile[] = [];

  const visit = (currentDirectory: Directory) => {
    for (const entry of currentDirectory.list()) {
      if (entry instanceof Directory) {
        visit(entry);
      } else if (entry instanceof File && supportsFilename(entry.name)) {
        files.push({
          mimeType: entry.type || undefined,
          name: entry.name,
          size: entry.size,
          uri: entry.uri,
        });
      }
    }
  };

  visit(directory);
  return files.sort((first, second) => first.uri.localeCompare(second.uri));
}

function isPickerCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = "code" in error ? String(error.code) : "";
  return (
    code === "ERR_PICKER_CANCELLED" ||
    code === "ERR_FILE_PICKING_CANCELLED" ||
    error.message.toLowerCase().includes("picker was cancelled")
  );
}

export async function pickDirectoryMediaFiles(
  supportsFilename: SupportsFilename,
): Promise<PickedDirectoryFile[] | null> {
  try {
    const directory = await Directory.pickDirectoryAsync();
    return collectDirectoryMediaFiles(directory, supportsFilename);
  } catch (error: unknown) {
    if (isPickerCancellation(error)) return null;
    throw error;
  }
}
