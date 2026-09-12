import type {
    Collection,
    CollectionRole,
    SettingKey,
    Sound,
} from "../domain/models";

export interface SoundRepository {
  getById(id: string): Promise<Sound | null>;
  listByCollection(collectionId: string): Promise<readonly Sound[]>;
  listMembershipCollectionIds(soundId: string): Promise<readonly string[]>;
  setMembership(
    soundId: string,
    collectionId: string,
    included: boolean,
  ): Promise<void>;
}

export interface CollectionRepository {
  getById(id: string): Promise<Collection | null>;
  listChildren(parentId: string): Promise<readonly Collection[]>;
  listAncestors(id: string): Promise<readonly Collection[]>;
  listAll(): Promise<readonly Collection[]>;
  listValidParents(id: string): Promise<readonly Collection[]>;
  listPlayableSounds(id: string): Promise<readonly Sound[]>;
  create(
    name: string,
    role: CollectionRole,
    parentId: string,
  ): Promise<Collection>;
  reparent(id: string, parentId: string): Promise<void>;
}

export interface SettingsRepository {
  get(key: SettingKey): Promise<string | null>;
  set(key: SettingKey, value: string): Promise<void>;
}
