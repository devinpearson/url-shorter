-- When each short link was opened, so links that haven't been used for a long time can be found
-- and eventually released. Only the time is stored: nothing about who clicked.

-- The latest click, kept on the link itself so "unused since" is a cheap, indexed query.
ALTER TABLE urls ADD COLUMN last_clicked_at timestamptz;

-- One row per click, for click history and stats over time.
CREATE TABLE url_clicks (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url_id     uuid NOT NULL REFERENCES urls (id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX url_clicks_url_id_clicked_at_idx ON url_clicks (url_id, clicked_at DESC);

-- A link's last activity is its latest click, or when it was created if it has never been clicked.
CREATE INDEX urls_last_activity_idx ON urls ((coalesce(last_clicked_at, created_at)));
