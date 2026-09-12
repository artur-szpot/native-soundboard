import type { SQLiteDatabase } from "expo-sqlite";

import type { Sound } from "../domain/models";
import type { SoundRepository } from "./contracts";

interface SoundRow {
  id: string;
  name: string;
  media_path: string;
  icon_uri: string | null;
  created_at: number;
  updated_at: number;
}

function mapSound(row: SoundRow): Sound {
  return {
    id: row.id,
    name: row.name,
    mediaPath: row.media_path,
    iconUri: row.icon_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteSoundRepository implements SoundRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getById(id: string): Promise<Sound | null> {
    const row = await this.database.getFirstAsync<SoundRow>(
      "SELECT * FROM sounds WHERE id = ?",
      id,
    );
    return row ? mapSound(row) : null;
  }

  async listByCollection(collectionId: string): Promise<readonly Sound[]> {
    const rows = await this.database.getAllAsync<SoundRow>(
      `SELECT sounds.* FROM sounds
       INNER JOIN sound_collection_memberships memberships
         ON memberships.sound_id = sounds.id
       WHERE memberships.collection_id = ?
       ORDER BY sounds.name COLLATE NOCASE`,
      collectionId,
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
}
