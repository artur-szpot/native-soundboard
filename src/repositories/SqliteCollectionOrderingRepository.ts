import type { SQLiteDatabase } from "expo-sqlite";

import {
    listOrderedChildIds,
    moveCollectionToParent,
    moveSoundToCollection,
    reorderChildren,
} from "./collectionOrdering";
import type { CollectionOrderingRepository, OrderedItem } from "./contracts";

export class SqliteCollectionOrderingRepository implements CollectionOrderingRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  listOrderedChildIds(collectionId: string): Promise<readonly OrderedItem[]> {
    return listOrderedChildIds(this.database, collectionId);
  }

  reorderChildren(
    collectionId: string,
    orderedItems: readonly OrderedItem[],
  ): Promise<void> {
    return reorderChildren(this.database, collectionId, orderedItems);
  }

  moveSoundToCollection(
    soundId: string,
    fromCollectionId: string,
    toCollectionId: string,
    targetIndex: number,
  ): Promise<void> {
    return moveSoundToCollection(
      this.database,
      soundId,
      fromCollectionId,
      toCollectionId,
      targetIndex,
    );
  }

  async moveCollectionToParent(
    collectionId: string,
    toParentId: string,
    targetIndex: number,
  ): Promise<void> {
    if (collectionId === "main") {
      throw new Error("Main cannot be moved.");
    }
    if (collectionId === toParentId) {
      throw new Error("A collection cannot be its own parent.");
    }

    const collection = await this.database.getFirstAsync<{
      parent_id: string | null;
    }>("SELECT parent_id FROM collections WHERE id = ?", collectionId);
    if (!collection?.parent_id) {
      throw new Error("Collection does not exist.");
    }

    const parent = await this.database.getFirstAsync<{ id: string }>(
      "SELECT id FROM collections WHERE id = ?",
      toParentId,
    );
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
      collectionId,
      toParentId,
    );
    if (descendant) {
      throw new Error(
        "A collection cannot be moved below one of its descendants.",
      );
    }

    await moveCollectionToParent(
      this.database,
      collectionId,
      collection.parent_id,
      toParentId,
      targetIndex,
    );
  }
}
