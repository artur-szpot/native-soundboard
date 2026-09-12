import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_NAME = "native-soundboard.db";
export const CURRENT_SCHEMA_VERSION = 4;

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

const migrationThree = `
  INSERT OR IGNORE INTO collections (
    id, name, role, icon_uri, parent_id, created_at, updated_at
  ) VALUES
    ('favorites', 'Favorites', 'directory', NULL, 'main',
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('surprise-me', 'Surprise Me', 'randomizer', NULL, 'main',
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  INSERT OR IGNORE INTO sounds (
    id, name, media_path, icon_uri, created_at, updated_at
  ) VALUES
    ('bloom', 'Bloom', 'bundled:bloom', NULL,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('click', 'Click', 'bundled:click', NULL,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('rise', 'Rise', 'bundled:rise', NULL,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    ('low', 'Low', 'bundled:low', NULL,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000,
      CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  INSERT OR IGNORE INTO sound_collection_memberships (sound_id, collection_id)
  VALUES
    ('bloom', 'main'), ('click', 'main'), ('rise', 'main'), ('low', 'main'),
    ('bloom', 'favorites'), ('rise', 'favorites'),
    ('bloom', 'surprise-me'), ('click', 'surprise-me'),
    ('rise', 'surprise-me'), ('low', 'surprise-me');

  INSERT OR IGNORE INTO schema_migrations (version, applied_at)
  VALUES (3, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  PRAGMA user_version = 3;
`;

const migrationFour = `
  ALTER TABLE sounds ADD COLUMN original_filename TEXT;

  INSERT OR IGNORE INTO schema_migrations (version, applied_at)
  VALUES (4, CAST(strftime('%s', 'now') AS INTEGER) * 1000);

  PRAGMA user_version = 4;
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

  if (currentVersion < 3) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationThree);
    });
  }

  if (currentVersion < 4) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(migrationFour);
    });
  }
}
