import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_NAME = "native-soundboard.db";
export const CURRENT_SCHEMA_VERSION = 2;

type MigrationDatabase = Pick<
  SQLiteDatabase,
  "execAsync" | "getFirstAsync" | "withTransactionAsync"
>;

const migrationOne = `
  CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    role TEXT NOT NULL CHECK (role IN ('directory', 'randomizer')),
    icon_uri TEXT,
    parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    CHECK (
      (id = 'main' AND parent_id IS NULL AND role = 'directory') OR
      (id <> 'main' AND parent_id IS NOT NULL)
    )
  );

  CREATE TABLE IF NOT EXISTS sounds (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    media_path TEXT NOT NULL,
    icon_uri TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sound_collection_memberships (
    sound_id TEXT NOT NULL REFERENCES sounds(id) ON DELETE CASCADE,
    collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    PRIMARY KEY (sound_id, collection_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS collections_parent_id_idx ON collections(parent_id);
  CREATE INDEX IF NOT EXISTS memberships_collection_id_idx
    ON sound_collection_memberships(collection_id);

  INSERT OR IGNORE INTO collections (
    id, name, role, icon_uri, parent_id, created_at, updated_at
  ) VALUES (
    'main', 'Main', 'directory', NULL, NULL,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000,
    CAST(strftime('%s', 'now') AS INTEGER) * 1000
  );

  INSERT OR IGNORE INTO schema_migrations (version, applied_at)
  VALUES (1, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  PRAGMA user_version = 1;
`;

const migrationTwo = `
  INSERT OR IGNORE INTO settings (key, value) VALUES ('buttonSize', '132');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('themePreference', 'system');

  INSERT OR IGNORE INTO schema_migrations (version, applied_at)
  VALUES (2, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  PRAGMA user_version = 2;
`;

export async function migrateDatabase(
  database: MigrationDatabase,
): Promise<void> {
  await database.execAsync(
    "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;",
  );

  const result = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${CURRENT_SCHEMA_VERSION}.`,
    );
  }

  if (currentVersion < 1) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationOne);
    });
  }

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationTwo);
    });
  }
}
