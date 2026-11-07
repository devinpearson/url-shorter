# Club Links (toast.li)

A link shortener for Toastmasters clubs, live at **<https://toast.li>**. Club officers log in and turn long
meeting sign-up sheets, online meeting links and guest forms into short names like `toast.li/club-roles`,
then see how many people clicked.

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style components
- **Backend**: Node.js, Express, TypeScript, PostgreSQL (`pg` with plain SQL), Passport with Auth0
- **Email**: contact form messages are saved to the database and sent through Resend when configured

## Local development

1. `npm install` in the project root.
2. Copy `backend/.env.example` to `backend/.env` and fill it in. For local development set
   `ORIGIN=http://localhost:5173` and `AUTH0_CALLBACK_URL=http://localhost:5001/api/auth/callback`,
   and add both to the Auth0 application's allowed URLs.
3. Start Postgres: `npm run db:up` (Docker, port 5434, matching `DATABASE_URL` in the example).
4. Start the backend: `npm run backend:dev` (port 5001). It applies pending migrations on start.
5. Start the frontend: `npm run dev` (port 5173). Vite forwards `/api` requests to the backend.

### Database changes

The schema lives in numbered SQL files in `backend/migrations/`. To change it, add the next file (for example
`002_add_link_expiry.sql`); never edit one that has been deployed. The backend applies pending files on
start, each in a transaction, and records them in `schema_migrations`. `npm run db:migrate` applies them
without starting the server.

The Vite dev server forwards `/api` and short links (`/club-roles`) to the backend, the same split nginx
makes on toast.li, so links you create redirect locally too. The list of app pages that stay with the
frontend is in `vite.config.ts`.

## Quality checks

| Command                               | What it does                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run check` / `npm run check:fix` | Biome: formatting, linting (including React and Tailwind rules) and import order |
| `npm run typecheck`                   | TypeScript for the app, backend, configs and tests                               |
| `npm run knip`                        | Unused files, exports and dependencies                                           |
| `npm run lint:md`                     | Markdown style                                                                   |
| `npm test` / `npm run test:coverage`  | Vitest: React components (jsdom) and the API (supertest on a throwaway Postgres) |
| `npm run test:e2e`                    | Playwright on desktop Chrome and a Pixel 7, against the real backend             |
| `npm run verify:lighthouse`           | Lighthouse CI on the built app; score floors are in `lighthouserc.json`          |
| `npm run verify`                      | Everything above except Lighthouse; run it before opening a pull request         |

The API tests, end-to-end tests and Lighthouse use a throwaway Postgres: [PGlite](https://pglite.dev) (Postgres
compiled to WebAssembly) behind a local socket, with the schema from the real migrations, so they need no
Docker. The end-to-end tests and Lighthouse run the backend from `tests/e2e/api-server.ts`: the real Express
app with a test-only `POST /api/test/login` instead of Auth0. That route is only added by
`createApp({ enableTestLogin: true })`, which refuses to run when `NODE_ENV=production`.

`npx playwright install chromium` is needed once for the end-to-end tests.

Git hooks (husky) run Biome on staged files and the type check before each commit, and commitlint checks
that commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`chore:` …).

CI runs the checks, unit, API and end-to-end tests on every pull request. Deploys wait for them. Lighthouse
runs when the workflow is started by hand (Actions → CI/CD → Run workflow).

## Production (toast.li)

Club Links runs on the Hetzner server as a Docker Compose stack: one app container that serves the web app,
the API and the short-link redirects, and its own PostgreSQL 16. nginx on the host terminates TLS for
toast.li and proxies to the app. [deploy/README.md](deploy/README.md) has the details.

- **Ansible** (`~/projects/ansible/hetzner`, `playbooks/configure-club-links.yml`) sets up the server side:
  the stack folder, `secrets.env` (database password, session secret, Auth0 and Resend settings, from the
  vault), nginx and the certificate.
- **Every push to `main`** runs the checks and end-to-end tests, builds and smoke-tests the image, pushes it
  to GHCR and starts it on the server, rolling back if it doesn't become healthy. Migrations run as the
  app starts.

### Pages and short links

The backend decides which paths are app pages: `APP_PAGES` in `backend/src/appPages.ts` (in any letter
case). Those get `index.html`; any other single path segment is a short link. The same list keeps short
links from taking those names and tells the Vite dev server what to forward. When you add a page, add it
to `APP_PAGES` and to `src/main.tsx`.

### Click tracking

Every click updates the link's `clicks` count and `last_clicked_at`, and adds a row to `url_clicks` with
the time (nothing about who clicked). `npm run links:inactive -- 365` lists links with no clicks for 365
days, the candidates for releasing their names; it only reports.

The site must be served over HTTPS: in production the login cookie is only sent over HTTPS, and nginx
passes `X-Forwarded-Proto`.
