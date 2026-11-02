-- One row per star. A visitor proves a star is theirs with a secret token kept in their browser;
-- only its SHA-256 is stored here.
CREATE TABLE IF NOT EXISTS stars (
  id     TEXT PRIMARY KEY,            -- public id, random
  owner  TEXT NOT NULL UNIQUE,        -- SHA-256 of the visitor's token
  a      REAL NOT NULL,               -- angle around the planet, radians
  h      REAL NOT NULL,               -- height in the sky, 0 to 1
  name   TEXT NOT NULL DEFAULT '',
  org    TEXT NOT NULL DEFAULT '',
  word   TEXT NOT NULL DEFAULT '',
  lit    INTEGER NOT NULL,            -- ms since epoch
  hidden INTEGER NOT NULL DEFAULT 0   -- set by the owner for the rare miss
);
CREATE INDEX IF NOT EXISTS stars_lit ON stars (lit DESC);

-- Rate limiting: writes per hashed IP address per hour.
CREATE TABLE IF NOT EXISTS attempts (
  key   TEXT PRIMARY KEY,             -- hashed IP + hour
  count INTEGER NOT NULL,
  until INTEGER NOT NULL              -- ms since epoch when the row can be dropped
);
