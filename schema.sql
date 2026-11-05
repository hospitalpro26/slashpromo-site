-- Run these statements in the Cloudflare D1 "slashpromo_ads" SQL console.
CREATE TABLE IF NOT EXISTS campaigns(
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,provider_name TEXT NOT NULL,description TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('doctors','hospitals','laboratories','clinics')),
 city TEXT NOT NULL CHECK(city IN ('all','sukkur','khairpur','shikarpur','ghotki','karachi')),
 placement TEXT NOT NULL CHECK(placement IN ('all','homepage','city','category')),
 status TEXT NOT NULL CHECK(status IN ('draft','pending','approved','live','paused','archived')),
 cta_label TEXT NOT NULL,target_url TEXT NOT NULL,image_url TEXT,
 start_at TEXT,end_at TEXT,clicks INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_campaigns_live ON campaigns(status,placement,city,category,start_at,end_at);
CREATE TABLE IF NOT EXISTS campaign_audit(id TEXT PRIMARY KEY,campaign_id TEXT NOT NULL,actor_email TEXT NOT NULL,action TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_campaign_audit ON campaign_audit(campaign_id,created_at);