import { SqliteSettingsRepository } from "../src/repositories/SqliteSettingsRepository";

describe("SqliteSettingsRepository", () => {
  it("reads a setting with a bound key", async () => {
    const database = {
      getFirstAsync: jest.fn().mockResolvedValue({ value: "dark" }),
      runAsync: jest.fn(),
    };
    const repository = new SqliteSettingsRepository(database as never);

    await expect(repository.get("themePreference")).resolves.toBe("dark");
    expect(database.getFirstAsync).toHaveBeenCalledWith(
      "SELECT value FROM settings WHERE key = ?",
      "themePreference",
    );
  });

  it("upserts a setting with bound values", async () => {
    const database = {
      getFirstAsync: jest.fn(),
      runAsync: jest.fn().mockResolvedValue(undefined),
    };
    const repository = new SqliteSettingsRepository(database as never);

    await repository.set("buttonSize", "184");

    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT(key) DO UPDATE"),
      "buttonSize",
      "184",
    );
  });
});
