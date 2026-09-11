import type { Collection, SettingKey, Sound } from "../domain/models";

export interface SoundRepository {
  getById(id: string): Promise<Sound | null>;
  listByCollection(collectionId: string): Promise<readonly Sound[]>;
}

export interface CollectionRepository {
  getById(id: string): Promise<Collection | null>;
  listChildren(parentId: string): Promise<readonly Collection[]>;
}

export interface SettingsRepository {
  get(key: SettingKey): Promise<string | null>;
  set(key: SettingKey, value: string): Promise<void>;
}