-- Add persisted flag used by the hardcoded Today collection workflow
ALTER TABLE dots
ADD COLUMN IF NOT EXISTS flag_for_today BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_dots_user_today_flag
ON dots(user_id, flag_for_today);
