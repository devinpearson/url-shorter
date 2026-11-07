-- Where each click came from, and the addresses a link used to point to.

-- 'qr' when the link was opened from its QR code (the QR code adds ?src=qr), otherwise 'link'
-- (typed in, or clicked in a message or page). Still nothing about who clicked.
ALTER TABLE url_clicks
  ADD COLUMN source text NOT NULL DEFAULT 'link' CHECK (source IN ('link', 'qr'));

-- A link's destination can change (a new Zoom link each term) while the printed name stays the
-- same. Each change keeps the old address here.
CREATE TABLE url_destination_history (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url_id       uuid NOT NULL REFERENCES urls (id) ON DELETE CASCADE,
  original_url text NOT NULL,
  replaced_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX url_destination_history_url_id_idx ON url_destination_history (url_id, replaced_at DESC);
