# Server deployment

Club Links runs on the Hetzner server as the compose stack in [compose.yml](compose.yml), in
`~/stacks/club-links`: the app (container `club-links`, on `127.0.0.1:8090`) and its own
PostgreSQL 16 (`club-links-db-1`, reachable only inside the stack, volume `club-links_pgdata`).
nginx on the host serves <https://toast.li> and proxies everything to the app, which serves the web
app, the API and the short-link redirects itself. The server's monitoring requires both containers
and probes `/api/health`, which also checks the database. The nightly backup on the server dumps
the database with every other `postgres:*` container.

## Who sets up what

- **Ansible** (`~/projects/ansible/hetzner`, `playbooks/configure-club-links.yml`): the stack
  folder, `secrets.env` (mode 600, never leaves the server), nginx and the TLS certificate for
  toast.li. With `vault_github_token` in the vault it also fetches this compose file and starts the
  stack, which a rebuilt host needs.
- **Every push to `main`** ([../.github/workflows/deployment.yml](../.github/workflows/deployment.yml)):
  the checks and end-to-end tests, then build the image, run
  [../scripts/docker-smoke-test.sh](../scripts/docker-smoke-test.sh) against a throwaway PostgreSQL,
  push `sha-<commit>` and `latest` to GHCR, copy `compose.yml` to the server, write `IMAGE_TAG` and
  `APP_PORT` to `.env` beside it, then `docker compose up --wait`. The app applies pending
  migrations (`backend/migrations`) as it starts. If the release doesn't become healthy, the
  previous `IMAGE_TAG` is started again and the run fails. The deploy stops early if
  `secrets.env` is missing.

Repository secrets: `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` (the same server and user as
tm-contest's deploy). Repository variable `APP_PORT` (default 8090; it must match
`CLUB_LINKS_PORT` in Ansible if changed).

## secrets.env

Written by Ansible from the vault, keeping existing values across runs:

| Variable                                                         | Source                                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`, `PGPASSWORD`                                | `vault_club_links_postgres_password`, else the existing value, else generated |
| `SESSION_SECRET`                                                 | `vault_club_links_session_secret`, else the existing value, else generated    |
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`         | `vault_club_links_auth0_*` (required)                                         |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_RECIPIENT_EMAIL` | `vault_club_links_resend_*` (optional)                                        |

The database keeps the password it was created with, so don't change it on a live database.

## First deploy

1. Point toast.li's DNS (A record) at the server, so certbot can issue the certificate.
2. In the Auth0 application: Allowed Callback URLs `https://toast.li/api/auth/callback`, Allowed
   Logout URLs and Allowed Web Origins `https://toast.li`.
3. Add the `vault_club_links_auth0_*` secrets to the vault, then run
   `ansible-playbook playbooks/configure-club-links.yml` in `~/projects/ansible/hetzner`.
4. Add the repository secrets above and push to `main`.

## On the server

```bash
cd ~/stacks/club-links
docker compose ps
docker compose logs -f app
docker compose exec db psql -U club_links -d club_links -c '\dt'
docker compose exec app node backend/dist/scripts/listInactiveLinks.js 365   # unused links
```

## Rolling back

Set `IMAGE_TAG` in `~/stacks/club-links/.env` to an earlier `sha-<short>`, then
`docker compose up -d --wait`. Migrations are forward-only: an older image must work with the newer
schema, or restore the database from the nightly backup.
