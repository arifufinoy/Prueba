export const migrationV1 = `
CREATE TABLE IF NOT EXISTS meters (codigo TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS readings (
 clientId TEXT PRIMARY KEY NOT NULL, codigo TEXT NOT NULL, periodo TEXT NOT NULL,
 employee TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending_verification','pending_sync','sending','unknown_remote_result','sent','error','conflict')),
 data TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, nextAttempt INTEGER NOT NULL DEFAULT 0,
 UNIQUE(codigo, periodo)
);
CREATE INDEX IF NOT EXISTS queue_status ON readings(status,nextAttempt);
CREATE TABLE IF NOT EXISTS drafts (employee TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);
PRAGMA user_version = 1;
`;
