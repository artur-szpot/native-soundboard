import type { SQLiteDatabase } from "expo-sqlite";

export interface OrderedItem {
  id: string;
  kind: "collection" | "sound";
}

interface OrderedChildRow {
  id: string;
  kind: "collection" | "sound";
  order_index: number;
}

/** Combined count of child collections + member sounds directly under a collection. */
export async function nextOrderIndex(
  database: SQLiteDatabase,
  collectionId: string,
): Promise<number> {
  const [collectionCount, soundCount] = await Promise.all([
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM collections WHERE parent_id = ?",
      collectionId,
    ),
    database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sound_collection_memberships WHERE collection_id = ?",
      collectionId,
    ),
  ]);
  return (collectionCount?.count ?? 0) + (soundCount?.count ?? 0);
}

export async function listOrderedChildIds(
  database: SQLiteDatabase,
  collectionId: string,
): Promise<readonly OrderedItem[]> {
  const rows = await database.getAllAsync<OrderedChildRow>(
    `SELECT id, 'collection' AS kind, order_index FROM collections
     WHERE parent_id = ?
     UNION ALL
     SELECT sound_id AS id, 'sound' AS kind, order_index
     FROM sound_collection_memberships WHERE collection_id = ?
     ORDER BY order_index`,
    collectionId,
    collectionId,
  );
  return rows.map((row) => ({ id: row.id, kind: row.kind }));
}

/** Renumbers a collection's current children to a contiguous 0..n-1, preserving relative order. */
export async function resequence(
  database: SQLiteDatabase,
  collectionId: string,
): Promise<void> {
  const children = await listOrderedChildIds(database, collectionId);
  const timestamp = Date.now();
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.kind === "collection") {
      await database.runAsync(
        "UPDATE collections SET order_index = ?, updated_at = ? WHERE id = ?",
        index,
        timestamp,
        child.id,
      );
    } else {
      await database.runAsync(
        `UPDATE sound_collection_memberships SET order_index = ?
         WHERE sound_id = ? AND collection_id = ?`,
        index,
        child.id,
        collectionId,
      );
    }
  }
}

export async function reorderChildren(
  database: SQLiteDatabase,
  collectionId: string,
  orderedItems: readonly OrderedItem[],
): Promise<void> {
  const timestamp = Date.now();
  await database.withTransactionAsync(async () => {
    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index];
      if (item.kind === "collection") {
        await database.runAsync(
          `UPDATE collections SET order_index = ?, updated_at = ?
           WHERE id = ? AND parent_id = ?`,
          index,
          timestamp,
          item.id,
          collectionId,
        );
      } else {
        await database.runAsync(
          `UPDATE sound_collection_memberships SET order_index = ?
           WHERE sound_id = ? AND collection_id = ?`,
          index,
          item.id,
          collectionId,
        );
      }
    }
  });
}

/** Moves a sound into a collection at targetIndex; Main membership is never removed. */
export async function moveSoundToCollection(
  database: SQLiteDatabase,
  soundId: string,
  fromCollectionId: string,
  toCollectionId: string,
  targetIndex: number,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "UPDATE collections SET order_index = order_index + 1 WHERE parent_id = ? AND order_index >= ?",
      toCollectionId,
      targetIndex,
    );
    await database.runAsync(
      `UPDATE sound_collection_memberships SET order_index = order_index + 1
       WHERE collection_id = ? AND order_index >= ?`,
      toCollectionId,
      targetIndex,
    );
    await database.runAsync(
      `INSERT INTO sound_collection_memberships (sound_id, collection_id, order_index)
       VALUES (?, ?, ?)
       ON CONFLICT (sound_id, collection_id) DO UPDATE SET order_index = excluded.order_index`,
      soundId,
      toCollectionId,
      targetIndex,
    );
    if (fromCollectionId !== toCollectionId && fromCollectionId !== "main") {
      await database.runAsync(
        "DELETE FROM sound_collection_memberships WHERE sound_id = ? AND collection_id = ?",
        soundId,
        fromCollectionId,
      );
      await resequence(database, fromCollectionId);
    }
  });
}

/** Reparents a collection to toParentId at targetIndex; caller must validate cycle-safety. */
export async function moveCollectionToParent(
  database: SQLiteDatabase,
  collectionId: string,
  fromParentId: string,
  toParentId: string,
  targetIndex: number,
): Promise<void> {
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      "UPDATE collections SET order_index = order_index + 1 WHERE parent_id = ? AND order_index >= ?",
      toParentId,
      targetIndex,
    );
    await database.runAsync(
      `UPDATE sound_collection_memberships SET order_index = order_index + 1
       WHERE collection_id = ? AND order_index >= ?`,
      toParentId,
      targetIndex,
    );
    await database.runAsync(
      "UPDATE collections SET parent_id = ?, order_index = ?, updated_at = ? WHERE id = ?",
      toParentId,
      targetIndex,
      Date.now(),
      collectionId,
    );
    if (fromParentId !== toParentId) {
      await resequence(database, fromParentId);
    }
  });
}
