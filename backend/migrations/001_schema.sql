-- Club Links schema: users, short links, contact messages and login sessions.
-- gen_random_uuid() is built in from PostgreSQL 13.

CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Auth0 user id (profile.id), e.g. "google-oauth2|123".
  auth0_id     text NOT NULL UNIQUE,
  display_name text NOT NULL,
  -- Not every Auth0 connection returns an email; NULLs don't clash with UNIQUE.
  email        text UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE urls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lowercase letters, numbers and single dashes, so names are easy to read off a poster
  -- and type. The app lowercases incoming names, which makes links case-insensitive.
  short_id     text NOT NULL UNIQUE CHECK (
                 length(short_id) BETWEEN 3 AND 32
                 AND short_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
               ),
  original_url text NOT NULL CHECK (length(original_url) <= 2048),
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  clicks       integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- The dashboard lists a user's links newest first.
CREATE INDEX urls_user_id_created_at_idx ON urls (user_id, created_at DESC);

CREATE TABLE contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (length(name) <= 100),
  email      text NOT NULL CHECK (length(email) <= 200),
  topic      text NOT NULL CHECK (topic IN ('question', 'feedback', 'report')),
  link       text CHECK (length(link) <= 300),
  message    text NOT NULL CHECK (length(message) <= 5000),
  user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  emailed    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Login sessions, in the layout connect-pg-simple expects.
CREATE TABLE session (
  sid    varchar NOT NULL PRIMARY KEY,
  sess   json NOT NULL,
  expire timestamp(6) NOT NULL
);

CREATE INDEX session_expire_idx ON session (expire);
