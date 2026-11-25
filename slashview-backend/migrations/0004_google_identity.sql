CREATE TABLE IF NOT EXISTS google_identities (subject TEXT PRIMARY KEY, account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS google_nonces (nonce_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS google_nonces_expiry ON google_nonces(expires_at);
