BEGIN;

-- UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Texto sin distinguir mayúsculas/minúsculas
CREATE EXTENSION IF NOT EXISTS citext;

COMMIT;