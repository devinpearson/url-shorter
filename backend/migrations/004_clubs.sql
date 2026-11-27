-- Clubs: links that belong to a club rather than one person, so they survive officer changes.
-- Every member of a club (its officers) can manage the club's links and invite the next officer.

CREATE TABLE clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The club page's address, toast.li/c/<slug>. Same rules as short names.
  slug       text NOT NULL UNIQUE CHECK (
               length(slug) BETWEEN 3 AND 32
               AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
             ),
  name       text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_members (
  club_id   uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

CREATE INDEX club_members_user_id_idx ON club_members (user_id);

-- Single-use invite links (toast.li/join/<token>). Only a hash of the token is stored.
CREATE TABLE club_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  used_by    uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX club_invites_club_id_idx ON club_invites (club_id);

-- A link can belong to a club. user_id stays as the person who made it.
ALTER TABLE urls
  ADD COLUMN club_id uuid REFERENCES clubs (id) ON DELETE SET NULL,
  -- A friendly label, e.g. "Weekly meeting (Zoom)", shown on the dashboard and club page.
  ADD COLUMN title text CHECK (length(title) <= 100),
  -- Listed on the club's public page.
  ADD COLUMN on_club_page boolean NOT NULL DEFAULT false;

CREATE INDEX urls_club_id_idx ON urls (club_id);
