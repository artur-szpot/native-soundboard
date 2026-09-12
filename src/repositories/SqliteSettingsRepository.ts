import type { SQLiteDatabase } from "expo-sqlite";

import type { SettingKey } from "../domain/models";
import type { SettingsRepository } from "./contracts";

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async get(key: SettingKey): Promise<string | null> {
    const row = await this.database.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      key,
    );

    return row?.value ?? null;
  }

  async set(key: SettingKey, value: string): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value,
    );
  }
}
