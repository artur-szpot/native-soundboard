import {
    CURRENT_SCHEMA_VERSION,
    migrateDatabase,
} from "../src/database/migrate";

describe("migrateDatabase", () => {
  it("configures SQLite and applies the initial schema in a transaction", async () => {
    const execAsync = jest.fn().mockResolvedValue(undefined);
    const database = {
      execAsync,
      getFirstAsync: jest.fn().mockResolvedValue({ user_version: 0 }),
      withTransactionAsync: jest.fn(async (task: () => Promise<void>) =>
        task(),
      ),
    };

    await migrateDatabase(database);

    expect(execAsync).toHaveBeenNthCalledWith(
      1,
      "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;",
    );
    expect(database.withTransactionAsync).toHaveBeenCalledTimes(6);
    expect(execAsync.mock.calls[1][0]).toContain(
      "CREATE TABLE IF NOT EXISTS sounds",
    );
    expect(execAsync.mock.calls[1][0]).toContain("'main', 'Main', 'directory'");
    expect(execAsync.mock.calls[2][0]).toContain("'buttonSize', '132'");
    expect(execAsync.mock.calls[2][0]).toContain("'buttonSize', '132'");
    expect(execAsync.mock.calls[3][0]).toContain(
      "'favorites', 'Favorites', 'directory'",
    );
    expect(execAsync.mock.calls[3][0]).toContain(
      "'surprise-me', 'Surprise Me', 'randomizer'",
    );
    expect(execAsync.mock.calls[3][0]).toContain("PRAGMA user_version = 3");
    expect(execAsync.mock.calls[4][0]).toContain(
      "ALTER TABLE sounds ADD COLUMN original_filename TEXT",
    );
    expect(execAsync.mock.calls[5][0]).toContain(
      "'hideAssignedSoundsInMain', 'true'",
    );
    expect(execAsync.mock.calls[5][0]).toContain("PRAGMA user_version = 5");
    expect(execAsync.mock.calls[6][0]).toContain(
      "ADD COLUMN hide_border INTEGER NOT NULL DEFAULT 0",
    );
    expect(execAsync.mock.calls[6][0]).toContain(
      `PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`,
    );
  });

  it("rejects a database created by a newer app version", async () => {
    const database = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest
        .fn()
        .mockResolvedValue({ user_version: CURRENT_SCHEMA_VERSION + 1 }),
      withTransactionAsync: jest.fn(),
    };

    await expect(migrateDatabase(database)).rejects.toThrow(
      "newer than supported",
    );
    expect(database.withTransactionAsync).not.toHaveBeenCalled();
  });
});
