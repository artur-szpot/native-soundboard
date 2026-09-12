export type CollectionRole = "directory" | "randomizer";

export interface Sound {
  id: string;
  name: string;
  mediaPath: string;
  originalFilename?: string | null;
  iconUri: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  role: CollectionRole;
  iconUri: string | null;
  hideBorder: boolean;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SoundCollectionMembership {
  soundId: string;
  collectionId: string;
}

export type SettingKey =
  | "buttonSize"
  | "hideAssignedSoundsInMain"
  | "themePreference";
export type ThemePreference = "system" | "light" | "dark";
