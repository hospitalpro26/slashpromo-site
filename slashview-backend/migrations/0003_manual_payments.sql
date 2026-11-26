-- Manual payment ledger; reference is unique to prevent double credit.
CREATE TABLE IF NOT EXISTS manual_payments (reference TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), amount_cents INTEGER NOT NULL CHECK(amount_cents=100), currency TEXT NOT NULL CHECK(currency='USD'), recorded_at TEXT NOT NULL, paid_until TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS manual_payments_account ON manual_payments(account_id);
