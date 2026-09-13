import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Sound } from "../domain/models";
import type { SoundRepository } from "./contracts";

interface SoundRow {
  id: string;
  name: string;
  media_path: string;
  original_filename?: string | null;
  icon_uri: string | null;
  hide_border: number;
  created_at: number;
  updated_at: number;
}

function mapSound(row: SoundRow): Sound {
  return {
    id: row.id,
    name: row.name,
    mediaPath: row.media_path,
    originalFilename: row.original_filename ?? null,
    iconUri: row.icon_uri,
    hideBorder: row.hide_border === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteSoundRepository implements SoundRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async create(
    name: string,
    mediaPath: string,
    originalFilename: string,
  ): Promise<Sound> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Sound name is required.");
    }
    if (!mediaPath) {
      throw new Error("Sound media is required.");
    }

    const id = randomUUID();
    const timestamp = Date.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO sounds
         (id, name, media_path, original_filename, icon_uri, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`,
        id,
        trimmedName,
        mediaPath,
        originalFilename,
        timestamp,
        timestamp,
      );
      await this.database.runAsync(
        `INSERT INTO sound_collection_memberships
         (sound_id, collection_id) VALUES (?, 'main')`,
        id,
      );
    });

    return {
      id,
      name: trimmedName,
      mediaPath,
      originalFilename,
      iconUri: null,
      hideBorder: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync("DELETE FROM sounds WHERE id = ?", id);
  }

  async getById(id: string): Promise<Sound | null> {
    const row = await this.database.getFirstAsync<SoundRow>(
      "SELECT * FROM sounds WHERE id = ?",
      id,
    );
    return row ? mapSound(row) : null;
  }

  async listByCollection(
    collectionId: string,
    hideAssignedSounds = false,
  ): Promise<readonly Sound[]> {
    const hideAssignedFilter =
      collectionId === "main" && hideAssignedSounds
        ? `AND NOT EXISTS (
            SELECT 1 FROM sound_collection_memberships other_memberships
            WHERE other_memberships.sound_id = sounds.id
              AND other_memberships.collection_id <> 'main'
          )`
        : "";
    const rows = await this.database.getAllAsync<SoundRow>(
      `SELECT sounds.* FROM sounds
       INNER JOIN sound_collection_memberships memberships
         ON memberships.sound_id = sounds.id
       WHERE memberships.collection_id = ?
       ${hideAssignedFilter}
       ORDER BY sounds.name COLLATE NOCASE`,
      collectionId,
    );
    return rows.map(mapSound);
  }

  async listAll(): Promise<readonly Sound[]> {
    const rows = await this.database.getAllAsync<SoundRow>(
      "SELECT * FROM sounds ORDER BY name COLLATE NOCASE",
    );
    return rows.map(mapSound);
  }

  listMembershipCollectionIds(soundId: string): Promise<readonly string[]> {
    return this.database
      .getAllAsync<{ collection_id: string }>(
        `SELECT collection_id FROM sound_collection_memberships
         WHERE sound_id = ? ORDER BY collection_id`,
        soundId,
      )
      .then((rows) => rows.map((row) => row.collection_id));
  }

  async setMembership(
    soundId: string,
    collectionId: string,
    included: boolean,
  ): Promise<void> {
    if (!included && collectionId === "main") {
      throw new Error("Sounds cannot be removed from Main.");
    }

    if (included) {
      await this.database.runAsync(
        `INSERT OR IGNORE INTO sound_collection_memberships
         (sound_id, collection_id) VALUES (?, ?)`,
        soundId,
        collectionId,
      );
      return;
    }

    await this.database.runAsync(
      `DELETE FROM sound_collection_memberships
       WHERE sound_id = ? AND collection_id = ?`,
      soundId,
      collectionId,
    );
  }

  async replaceMedia(
    id: string,
    mediaPath: string,
    originalFilename: string,
  ): Promise<void> {
    if (!mediaPath) {
      throw new Error("Sound media is required.");
    }
    await this.database.runAsync(
      `UPDATE sounds
       SET media_path = ?, original_filename = ?, updated_at = ? WHERE id = ?`,
      mediaPath,
      originalFilename,
      Date.now(),
      id,
    );
  }

  async updateName(id: string, name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Sound name is required.");
    }
    await this.database.runAsync(
      "UPDATE sounds SET name = ?, updated_at = ? WHERE id = ?",
      trimmedName,
      Date.now(),
      id,
    );
  }

  async updateIcon(id: string, iconUri: string | null): Promise<void> {
    await this.database.runAsync(
      "UPDATE sounds SET icon_uri = ?, updated_at = ? WHERE id = ?",
      iconUri,
      Date.now(),
      id,
    );
  }

  async updateHideBorder(id: string, hideBorder: boolean): Promise<void> {
    await this.database.runAsync(
      `UPDATE sounds
       SET hide_border = CASE
         WHEN icon_uri IS NOT NULL AND icon_uri NOT LIKE 'material:%' THEN ?
         ELSE 0
       END, updated_at = ? WHERE id = ?`,
      hideBorder ? 1 : 0,
      Date.now(),
      id,
    );
  }
}
