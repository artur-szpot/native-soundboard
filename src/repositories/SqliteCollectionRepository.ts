import { randomUUID } from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";

import type { Collection, CollectionRole, Sound } from "../domain/models";
import type { CollectionRepository } from "./contracts";

interface CollectionRow {
  id: string;
  name: string;
  role: CollectionRole;
  icon_uri: string | null;
  parent_id: string | null;
  created_at: number;
  updated_at: number;
}

interface SoundRow {
  id: string;
  name: string;
  media_path: string;
  original_filename?: string | null;
  icon_uri: string | null;
  created_at: number;
  updated_at: number;
}

function mapCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    iconUri: row.icon_uri,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSound(row: SoundRow): Sound {
  return {
    id: row.id,
    name: row.name,
    mediaPath: row.media_path,
    originalFilename: row.original_filename ?? null,
    iconUri: row.icon_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteCollectionRepository implements CollectionRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async delete(id: string): Promise<void> {
    if (id === "main") {
      throw new Error("Main cannot be deleted.");
    }

    await this.database.withTransactionAsync(async () => {
      const collection = await this.getById(id);
      if (!collection?.parentId) {
        throw new Error("Collection does not exist.");
      }
      await this.database.runAsync(
        "UPDATE collections SET parent_id = ?, updated_at = ? WHERE parent_id = ?",
        collection.parentId,
        Date.now(),
        id,
      );
      await this.database.runAsync("DELETE FROM collections WHERE id = ?", id);
    });
  }

  async getById(id: string): Promise<Collection | null> {
    const row = await this.database.getFirstAsync<CollectionRow>(
      "SELECT * FROM collections WHERE id = ?",
      id,
    );
    return row ? mapCollection(row) : null;
  }

  async listChildren(parentId: string): Promise<readonly Collection[]> {
    const rows = await this.database.getAllAsync<CollectionRow>(
      `SELECT * FROM collections WHERE parent_id = ?
       ORDER BY name COLLATE NOCASE`,
      parentId,
    );
    return rows.map(mapCollection);
  }

  async listAncestors(id: string): Promise<readonly Collection[]> {
    const rows = await this.database.getAllAsync<
      CollectionRow & { depth: number }
    >(
      `WITH RECURSIVE ancestors AS (
         SELECT *, 0 AS depth FROM collections WHERE id = ?
         UNION ALL
         SELECT parent.*, ancestors.depth + 1
         FROM collections parent
         INNER JOIN ancestors ON ancestors.parent_id = parent.id
       )
       SELECT * FROM ancestors WHERE id <> ? ORDER BY depth DESC`,
      id,
      id,
    );
    return rows.map(mapCollection);
  }

  async listAll(): Promise<readonly Collection[]> {
    const rows = await this.database.getAllAsync<CollectionRow>(
      "SELECT * FROM collections ORDER BY name COLLATE NOCASE",
    );
    return rows.map(mapCollection);
  }

  async listValidParents(id: string): Promise<readonly Collection[]> {
    const rows = await this.database.getAllAsync<CollectionRow>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT ?
         UNION ALL
         SELECT collections.id FROM collections
         INNER JOIN descendants ON collections.parent_id = descendants.id
       )
       SELECT * FROM collections
       WHERE id NOT IN (SELECT id FROM descendants)
       ORDER BY name COLLATE NOCASE`,
      id,
    );
    return rows.map(mapCollection);
  }

  async listPlayableSounds(id: string): Promise<readonly Sound[]> {
    const rows = await this.database.getAllAsync<SoundRow>(
      `WITH RECURSIVE descendants(id) AS (
         SELECT ?
         UNION ALL
         SELECT collections.id FROM collections
         INNER JOIN descendants ON collections.parent_id = descendants.id
       )
       SELECT DISTINCT sounds.* FROM sounds
       INNER JOIN sound_collection_memberships memberships
         ON memberships.sound_id = sounds.id
       INNER JOIN descendants ON descendants.id = memberships.collection_id
       ORDER BY sounds.id`,
      id,
    );
    return rows.map(mapSound);
  }

  async create(
    name: string,
    role: CollectionRole,
    parentId: string,
  ): Promise<Collection> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Collection name is required.");
    }

    const parent = await this.getById(parentId);
    if (!parent) {
      throw new Error("Parent collection does not exist.");
    }

    const id = randomUUID();
    const timestamp = Date.now();
    await this.database.runAsync(
      `INSERT INTO collections
       (id, name, role, icon_uri, parent_id, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?)`,
      id,
      trimmedName,
      role,
      parentId,
      timestamp,
      timestamp,
    );

    return {
      id,
      name: trimmedName,
      role,
      iconUri: null,
      parentId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async reparent(id: string, parentId: string): Promise<void> {
    if (id === "main") {
      throw new Error("Main cannot be moved.");
    }
    if (id === parentId) {
      throw new Error("A collection cannot be its own parent.");
    }

    await this.database.withTransactionAsync(async () => {
      const [collection, parent] = await Promise.all([
        this.getById(id),
        this.getById(parentId),
      ]);
      if (!collection) {
        throw new Error("Collection does not exist.");
      }
      if (!parent) {
        throw new Error("Parent collection does not exist.");
      }

      const descendant = await this.database.getFirstAsync<{ id: string }>(
        `WITH RECURSIVE descendants(id) AS (
           SELECT id FROM collections WHERE parent_id = ?
           UNION ALL
           SELECT collections.id FROM collections
           INNER JOIN descendants ON collections.parent_id = descendants.id
         )
         SELECT id FROM descendants WHERE id = ? LIMIT 1`,
        id,
        parentId,
      );
      if (descendant) {
        throw new Error(
          "A collection cannot be moved below one of its descendants.",
        );
      }

      await this.database.runAsync(
        "UPDATE collections SET parent_id = ?, updated_at = ? WHERE id = ?",
        parentId,
        Date.now(),
        id,
      );
    });
  }

  async update(id: string, name: string, role: CollectionRole): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Collection name is required.");
    }
    if (id === "main" && role !== "directory") {
      throw new Error("Main must remain a directory.");
    }
    await this.database.runAsync(
      "UPDATE collections SET name = ?, role = ?, updated_at = ? WHERE id = ?",
      trimmedName,
      role,
      Date.now(),
      id,
    );
  }
}
