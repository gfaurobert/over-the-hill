-- Persist per-stage dot colors in user preferences
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS dot_color_discovery TEXT NOT NULL DEFAULT '#b0cdfb',
ADD COLUMN IF NOT EXISTS dot_color_upslope TEXT NOT NULL DEFAULT '#a6e7be',
ADD COLUMN IF NOT EXISTS dot_color_danger_zone TEXT NOT NULL DEFAULT '#f8b4b4',
ADD COLUMN IF NOT EXISTS dot_color_downslope TEXT NOT NULL DEFAULT '#fcc7a1',
ADD COLUMN IF NOT EXISTS dot_color_done TEXT NOT NULL DEFAULT '#d0bdfb';
