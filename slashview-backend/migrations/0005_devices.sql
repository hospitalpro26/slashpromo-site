-- Apply once through migration tracking; existing sessions must sign in again.
CREATE TABLE IF NOT EXISTS devices(account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,device_hash TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(account_id,device_hash));
ALTER TABLE sessions ADD COLUMN device_hash TEXT;
CREATE INDEX IF NOT EXISTS sessions_device ON sessions(account_id,device_hash);
