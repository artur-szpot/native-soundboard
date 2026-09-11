export type CollectionRole = "directory" | "randomizer";

export interface Sound {
  id: string;
  name: string;
  mediaPath: string;
  iconUri: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  role: CollectionRole;
  iconUri: string | null;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SoundCollectionMembership {
  soundId: string;
  collectionId: string;
}

export type SettingKey = "buttonSize" | "themePreference";
export type ThemePreference = "system" | "light" | "dark";