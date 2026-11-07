#!/usr/bin/env bash
# Runs a freshly built image against a throwaway PostgreSQL before it is pushed:
#   scripts/docker-smoke-test.sh ghcr.io/devinpearson/url-shorter:sha-abc1234
set -euo pipefail

IMAGE="${1:?usage: docker-smoke-test.sh <image>}"
RUN_ID="club-links-smoke-$$"
NET="$RUN_ID-net"
PORT="${SMOKE_PORT:-18090}"
PG_IMAGE="postgres:16.15-alpine"

cleanup() {
  docker rm -f "$RUN_ID-app" "$RUN_ID-db" "$RUN_ID-nodb" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
fail() {
  echo "SMOKE TEST FAILED: $*" >&2
  docker logs "$RUN_ID-app" 2>&1 | tail -40 >&2 || true
  exit 1
}

# The same settings deploy/compose.yml gives the app; Auth0 is never reached here.
app_env=(
  -e PGHOST="$RUN_ID-db" -e PGDATABASE=club_links -e PGUSER=club_links -e PGPASSWORD=smoke
  -e SESSION_SECRET=smoke-secret -e ORIGIN="http://127.0.0.1:$PORT"
  -e AUTH0_DOMAIN=smoke.auth0.invalid -e AUTH0_CLIENT_ID=smoke -e AUTH0_CLIENT_SECRET=smoke
  -e AUTH0_CALLBACK_URL="http://127.0.0.1:$PORT/api/auth/callback"
)

docker network create "$NET" >/dev/null

echo "1. Refuses to start without a database"
if docker run --name "$RUN_ID-nodb" --network "$NET" -e SESSION_SECRET=x "$IMAGE" >/dev/null 2>&1; then
  fail "the app started without a database"
fi

echo "2. Migrates an empty database and reports healthy"
docker run -d --name "$RUN_ID-db" --network "$NET" \
  -e POSTGRES_DB=club_links -e POSTGRES_USER=club_links -e POSTGRES_PASSWORD=smoke \
  "$PG_IMAGE" >/dev/null
for _ in $(seq 1 30); do
  docker exec "$RUN_ID-db" pg_isready -U club_links -d club_links >/dev/null 2>&1 && break
  sleep 1
done

docker run -d --name "$RUN_ID-app" --network "$NET" -p "127.0.0.1:$PORT:8090" \
  "${app_env[@]}" "$IMAGE" >/dev/null

base="http://127.0.0.1:$PORT"
for _ in $(seq 1 30); do
  curl -fsS "$base/api/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "$base/api/health" | grep -q '"ok"' || fail "/api/health is not ok"
docker logs "$RUN_ID-app" 2>&1 | grep -q "Applied migrations: 001_schema.sql" ||
  fail "migrations did not run"

echo "3. Runs as a non-root user"
[ "$(docker exec "$RUN_ID-app" id -u)" != "0" ] || fail "the app runs as root"

echo "4. Serves the web app, its pages and static files"
curl -fsS "$base/" | grep -q "Club Links" || fail "the web app is not served"
curl -fsS "$base/About" | grep -q "<div id=\"root\">" || fail "/About is not the app"
curl -fsS "$base/robots.txt" | grep -q "Sitemap:" || fail "robots.txt is not served"

echo "5. Answers the API and short links"
[ "$(curl -fsS "$base/api/auth/me")" = "null" ] || fail "/api/auth/me should be null when logged out"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/urls")" = "401" ] ||
  fail "signed-out request was not rejected"
curl -s "$base/no-such-link" | grep -q "We couldn't find that link" ||
  fail "unknown short links don't get the not-found page"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/api/auth/login")" = "302" ] ||
  fail "login doesn't redirect to Auth0"

echo "Smoke test passed"
