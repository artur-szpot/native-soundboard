import {
    moveSoundToCollection,
    reorderChildren,
} from "../src/repositories/collectionOrdering";
import { SqliteCollectionOrderingRepository } from "../src/repositories/SqliteCollectionOrderingRepository";

describe("collectionOrdering helpers", () => {
  it("renumbers a mixed collection/sound sequence contiguously", async () => {
    const database = {
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };

    await reorderChildren(database as never, "parent", [
      { id: "collection-a", kind: "collection" },
      { id: "sound-a", kind: "sound" },
      { id: "collection-b", kind: "collection" },
    ]);

    expect(database.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE collections SET order_index"),
      0,
      expect.any(Number),
      "collection-a",
      "parent",
    );
    expect(database.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "UPDATE sound_collection_memberships SET order_index",
      ),
      1,
      "sound-a",
      "parent",
    );
    expect(database.runAsync).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("UPDATE collections SET order_index"),
      2,
      expect.any(Number),
      "collection-b",
      "parent",
    );
  });

  it("moves a sound into a target collection and removes the prior membership", async () => {
    const database = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn().mockResolvedValue([]),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };

    await moveSoundToCollection(
      database as never,
      "bloom",
      "favorites",
      "trip",
      1,
    );

    expect(database.runAsync).toHaveBeenCalledWith(
      "DELETE FROM sound_collection_memberships WHERE sound_id = ? AND collection_id = ?",
      "bloom",
      "favorites",
    );
  });

  it("never removes a sound's Main membership when moving it elsewhere", async () => {
    const database = {
      runAsync: jest.fn(),
      getAllAsync: jest.fn().mockResolvedValue([]),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };

    await moveSoundToCollection(database as never, "bloom", "main", "trip", 0);

    expect(database.runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sound_collection_memberships"),
      "bloom",
      "main",
    );
  });
});

describe("SqliteCollectionOrderingRepository", () => {
  it("rejects making a collection its own parent", async () => {
    const database = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
    const repository = new SqliteCollectionOrderingRepository(
      database as never,
    );

    await expect(
      repository.moveCollectionToParent("favorites", "favorites", 0),
    ).rejects.toThrow("cannot be its own parent");
  });

  it("rejects moving a collection below one of its own descendants", async () => {
    const database = {
      getFirstAsync: jest
        .fn()
        .mockResolvedValueOnce({ parent_id: "main" })
        .mockResolvedValueOnce({ id: "child" })
        .mockResolvedValueOnce({ id: "child" }),
      runAsync: jest.fn(),
    };
    const repository = new SqliteCollectionOrderingRepository(
      database as never,
    );

    await expect(
      repository.moveCollectionToParent("source", "child", 0),
    ).rejects.toThrow("cannot be moved below one of its descendants");
  });

  it("rejects moving Main", async () => {
    const database = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
    const repository = new SqliteCollectionOrderingRepository(
      database as never,
    );

    await expect(
      repository.moveCollectionToParent("main", "favorites", 0),
    ).rejects.toThrow("Main cannot be moved");
  });
});
