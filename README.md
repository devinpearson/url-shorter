# Club Links (toast.li)

A link shortener for Toastmasters clubs, live at **<https://toast.li>**. Club officers log in and turn long
meeting sign-up sheets, online meeting links and guest forms into short names like `toast.li/club-roles`,
then see how many people clicked.

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style components
- **Backend**: Node.js, Express, TypeScript, MongoDB (Mongoose), Passport with Auth0
- **Email**: contact form messages are saved to MongoDB and sent through Resend when configured

## Local development

1. `npm install` in the project root.
2. Copy `backend/.env.example` to `backend/.env` and fill it in. For local development set
   `ORIGIN=http://localhost:5173` and `AUTH0_CALLBACK_URL=http://localhost:5001/api/auth/callback`,
   and add both to the Auth0 application's allowed URLs.
3. Start the backend: `npm run backend:dev` (port 5001).
4. Start the frontend: `npm run dev` (port 5173). Vite forwards `/api` requests to the backend.

Short links don't redirect through the Vite dev server; open `http://localhost:5001/<name>` to test one.

## Quality checks

| Command                               | What it does                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| `npm run check` / `npm run check:fix` | Biome: formatting, linting (including React and Tailwind rules) and import order |
| `npm run typecheck`                   | TypeScript for the app, backend, configs and tests                               |
| `npm run knip`                        | Unused files, exports and dependencies                                           |
| `npm run lint:md`                     | Markdown style                                                                   |
| `npm test` / `npm run test:coverage`  | Vitest: React components (jsdom) and the API (supertest on an in-memory MongoDB) |
| `npm run test:e2e`                    | Playwright on desktop Chrome and a Pixel 7, against the real backend             |
| `npm run verify:lighthouse`           | Lighthouse CI on the built app; score floors are in `lighthouserc.json`          |
| `npm run verify`                      | Everything above except Lighthouse; run it before opening a pull request         |

The end-to-end tests and Lighthouse run the backend from `tests/e2e/api-server.ts`: the real Express app on an
in-memory MongoDB, with a test-only `POST /api/test/login` instead of Auth0. That route is only added by
`createApp({ enableTestLogin: true })`, which refuses to run when `NODE_ENV=production`.

The first test run downloads a MongoDB binary, and `npx playwright install chromium` is needed once for the
end-to-end tests.

Git hooks (husky) run Biome on staged files and the type check before each commit, and commitlint checks
that commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
`chore:` …).

CI runs the checks, unit, API and end-to-end tests on every pull request. Deploys wait for them. Lighthouse
runs when the workflow is started by hand (Actions → CI/CD → Run workflow).

## Production (toast.li)

Pushing to `main` runs the checks in `.github/workflows/deployment.yml` and, if they pass, deploys to the
server over SSH: it pulls, installs, builds the frontend (`dist/`) and backend (`backend/dist/`), then
reloads pm2 with `NODE_ENV=production`.

### Settings

GitHub repository secrets (passed to the server on each deploy, and they override `backend/.env`):

| Secret                                                   | Production value                                 |
| -------------------------------------------------------- | ------------------------------------------------ |
| `ORIGIN`                                                 | `https://toast.li`                               |
| `AUTH0_CALLBACK_URL`                                     | `https://toast.li/api/auth/callback`             |
| `MONGO_URI`, `SESSION_SECRET`                            | the production database and a long random secret |
| `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_DOMAIN` | from the Auth0 application                       |

Every one of these must be set: an empty secret replaces the value in the server's `.env`.
The optional Resend settings (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_RECIPIENT_EMAIL`) go in the
server's `backend/.env`.

In the Auth0 application, add:

- **Allowed Callback URLs**: `https://toast.li/api/auth/callback`
- **Allowed Logout URLs** and **Allowed Web Origins**: `https://toast.li`

### Routing

One domain serves the API, the app's pages and the short links, so nginx has to tell them apart.
`deploy/nginx/toast.li.conf` is an example config:

- `/api/...` goes to Express.
- App pages (`/`, `/dashboard`, `/login`, `/about`, `/contact`, `/terms`, `/stats/...`) get `dist/index.html`.
- Static files in `dist/` are served directly.
- Anything else, such as `/club-roles`, goes to Express, which redirects the short link.

When you add a page, add its path to the nginx config and to `RESERVED_SHORT_IDS` in
`backend/src/routes/url.ts`, so no one can create a short link that the page would hide.

The site must be served over HTTPS: in production the login cookie is only sent over HTTPS, and nginx must
pass `X-Forwarded-Proto`.
