CREATE TABLE IF NOT EXISTS message_threads (
 id TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 subject TEXT NOT NULL CHECK(subject IN ('Complaint','Suggestion','Feedback','Renewal','Other')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS message_threads_account ON message_threads(account_id);
CREATE TABLE IF NOT EXISTS messages (
 sequence INTEGER PRIMARY KEY AUTOINCREMENT,
 id TEXT NOT NULL UNIQUE,
 thread_id TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
 author TEXT NOT NULL CHECK(author IN ('member','admin')),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),
 created_at TEXT NOT NULL,
 read_at TEXT
);
CREATE INDEX IF NOT EXISTS messages_thread ON messages(thread_id,sequence);
