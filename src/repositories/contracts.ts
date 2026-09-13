import type {
    Collection,
    CollectionRole,
    SettingKey,
    Sound,
} from "../domain/models";

export interface SoundRepository {
  create(
    name: string,
    mediaPath: string,
    originalFilename: string,
  ): Promise<Sound>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Sound | null>;
  listByCollection(
    collectionId: string,
    hideAssignedSounds?: boolean,
  ): Promise<readonly Sound[]>;
  listMembershipCollectionIds(soundId: string): Promise<readonly string[]>;
  replaceMedia(
    id: string,
    mediaPath: string,
    originalFilename: string,
  ): Promise<void>;
  listAll(): Promise<readonly Sound[]>;
  setMembership(
    soundId: string,
    collectionId: string,
    included: boolean,
  ): Promise<void>;
  updateHideBorder(id: string, hideBorder: boolean): Promise<void>;
  updateIcon(id: string, iconUri: string | null): Promise<void>;
  updateName(id: string, name: string): Promise<void>;
}

export interface CollectionRepository {
  delete(id: string): Promise<void>;
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
  updateHideBorder(id: string, hideBorder: boolean): Promise<void>;
  updateIcon(id: string, iconUri: string | null): Promise<void>;
  update(id: string, name: string, role: CollectionRole): Promise<void>;
}

export interface SettingsRepository {
  get(key: SettingKey): Promise<string | null>;
  set(key: SettingKey, value: string): Promise<void>;
}
