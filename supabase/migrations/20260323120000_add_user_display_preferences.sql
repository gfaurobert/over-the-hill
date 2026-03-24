-- Persist display preferences at account level in user_preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS gradient_start_color TEXT,
ADD COLUMN IF NOT EXISTS gradient_end_color TEXT,
ADD COLUMN IF NOT EXISTS split_hill_area_fill_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_today_collection BOOLEAN NOT NULL DEFAULT TRUE;
