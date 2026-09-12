import { SqliteCollectionRepository } from "../src/repositories/SqliteCollectionRepository";
import { SqliteSoundRepository } from "../src/repositories/SqliteSoundRepository";

describe("SQLite collection and sound repositories", () => {
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
});
