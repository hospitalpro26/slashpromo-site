CREATE TABLE IF NOT EXISTS message_broadcasts (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 subject TEXT NOT NULL,
 body TEXT NOT NULL,
 recipient_count INTEGER
);
CREATE TABLE IF NOT EXISTS message_broadcast_targets (
 broadcast_id TEXT NOT NULL REFERENCES message_broadcasts(id) ON DELETE CASCADE,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 thread_id TEXT NOT NULL UNIQUE,
 PRIMARY KEY (broadcast_id,account_id)
);
