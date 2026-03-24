-- Align dot color preference defaults with updated product palette
ALTER TABLE user_preferences
ALTER COLUMN dot_color_discovery SET DEFAULT '#b0cdfb',
ALTER COLUMN dot_color_upslope SET DEFAULT '#a6e7be',
ALTER COLUMN dot_color_danger_zone SET DEFAULT '#f8b4b4',
ALTER COLUMN dot_color_downslope SET DEFAULT '#fcc7a1',
ALTER COLUMN dot_color_done SET DEFAULT '#d0bdfb';
