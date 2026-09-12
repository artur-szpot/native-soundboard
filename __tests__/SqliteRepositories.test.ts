import { SqliteCollectionRepository } from "../src/repositories/SqliteCollectionRepository";
import { SqliteSoundRepository } from "../src/repositories/SqliteSoundRepository";

describe("SQLite collection and sound repositories", () => {
  it("can hide sounds with non-Main memberships from Main", async () => {
    const database = { getAllAsync: jest.fn().mockResolvedValue([]) };
    const repository = new SqliteSoundRepository(database as never);

    await repository.listByCollection("main", true);

    expect(database.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("AND other_memberships.collection_id <> 'main'"),
      "main",
    );
  });

  it("does not apply the Main filter to another collection", async () => {
    const database = { getAllAsync: jest.fn().mockResolvedValue([]) };
    const repository = new SqliteSoundRepository(database as never);

    await repository.listByCollection("favorites", true);

    expect(database.getAllAsync.mock.calls[0][0]).not.toContain("NOT EXISTS");
  });

  it("prevents removing a sound from Main", async () => {
    const database = { runAsync: jest.fn() };
    const repository = new SqliteSoundRepository(database as never);

    await expect(
      repository.setMembership("bloom", "main", false),
    ).rejects.toThrow("cannot be removed");
    expect(database.runAsync).not.toHaveBeenCalled();
  });

  it("deduplicates sounds reached through a randomizer descendant tree", async () => {
    const database = { getAllAsync: jest.fn().mockResolvedValue([]) };
    const repository = new SqliteCollectionRepository(database as never);

    await repository.listPlayableSounds("mix");

    expect(database.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("SELECT DISTINCT sounds.*"),
      "mix",
    );
    expect(database.getAllAsync.mock.calls[0][0]).toContain(
      "WITH RECURSIVE descendants",
    );
  });

  it("rejects moving a collection below its descendant", async () => {
    const database = {
      getFirstAsync: jest
        .fn()
        .mockResolvedValueOnce({
          id: "source",
          name: "Source",
          role: "directory",
          icon_uri: null,
          parent_id: "main",
          created_at: 1,
          updated_at: 1,
        })
        .mockResolvedValueOnce({
          id: "child",
          name: "Child",
          role: "directory",
          icon_uri: null,
          parent_id: "source",
          created_at: 1,
          updated_at: 1,
        })
        .mockResolvedValueOnce({ id: "child" }),
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };
    const repository = new SqliteCollectionRepository(database as never);

    await expect(repository.reparent("source", "child")).rejects.toThrow(
      "descendants",
    );
    expect(database.runAsync).not.toHaveBeenCalled();
  });

  it("creates an imported sound with an immutable Main membership", async () => {
    const database = {
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };
    const repository = new SqliteSoundRepository(database as never);

    const sound = await repository.create(
      "  Air Horn  ",
      "media/sound.mp3",
      "air-horn.mp3",
    );

    expect(sound.name).toBe("Air Horn");
    expect(database.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("VALUES (?, 'main')"),
      sound.id,
    );
  });

  it("reparents children before deleting a collection", async () => {
    const database = {
      getFirstAsync: jest.fn().mockResolvedValue({
        id: "source",
        name: "Source",
        role: "directory",
        icon_uri: null,
        parent_id: "main",
        created_at: 1,
        updated_at: 1,
      }),
      runAsync: jest.fn(),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };
    const repository = new SqliteCollectionRepository(database as never);

    await repository.delete("source");

    expect(database.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE collections SET parent_id"),
      "main",
      expect.any(Number),
      "source",
    );
    expect(database.runAsync).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM collections WHERE id = ?",
      "source",
    );
  });

  it("does not allow Main to become a randomizer or be deleted", async () => {
    const database = { runAsync: jest.fn() };
    const repository = new SqliteCollectionRepository(database as never);

    await expect(
      repository.update("main", "Main", "randomizer"),
    ).rejects.toThrow("remain a directory");
    await expect(repository.delete("main")).rejects.toThrow(
      "cannot be deleted",
    );
    expect(database.runAsync).not.toHaveBeenCalled();
  });

  it("updates sound and collection icon references", async () => {
    const database = { runAsync: jest.fn().mockResolvedValue(undefined) };
    const sounds = new SqliteSoundRepository(database as never);
    const collections = new SqliteCollectionRepository(database as never);

    await sounds.updateIcon("bloom", "material:music-note");
    await collections.updateIcon("favorites", "media/images/icon.png");

    expect(database.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("UPDATE sounds SET icon_uri"),
      "material:music-note",
      expect.any(Number),
      "bloom",
    );
    expect(database.runAsync).toHaveBeenNthCalledWith(
      2,
      expect.not.stringContaining("hide_border"),
      "media/images/icon.png",
      expect.any(Number),
      "favorites",
    );
  });

  it("only hides borders for collections with imported images", async () => {
    const database = { runAsync: jest.fn().mockResolvedValue(undefined) };
    const repository = new SqliteCollectionRepository(database as never);

    await repository.updateHideBorder("favorites", true);

    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("icon_uri NOT LIKE 'material:%'"),
      1,
      expect.any(Number),
      "favorites",
    );
  });
});
