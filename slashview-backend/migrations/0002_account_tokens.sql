-- Additive migration; no existing data changed.
CREATE TABLE IF NOT EXISTS account_tokens (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, purpose TEXT NOT NULL CHECK(purpose IN ('verify','reset')), token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, PRIMARY KEY(account_id,purpose));
CREATE INDEX IF NOT EXISTS account_tokens_expiry ON account_tokens(expires_at);
