# Copilot instructions

<!-- Workspace instructions for Copilot:
https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

Club Links (toast.li) is a link shortener for Toastmasters clubs.

- **Backend**: Node.js, Express, TypeScript, PostgreSQL (`pg`, plain SQL), Passport with Auth0. The app is
  built in `backend/src/app.ts`; `backend/src/index.ts` applies migrations and listens. Queries live in
  `backend/src/db/`; schema changes are new numbered files in `backend/migrations/`, never edits to old ones.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4 and shadcn-style components in `src/components/ui`.

Conventions:

- Use best practices for authentication and security; validate input on the server.
- Use the components in `src/components/ui` for frontend UI, and the colours in `tailwind.config.js`.
- Use RESTful API design for backend endpoints, and TypeScript throughout.
- Format and lint with Biome (`npm run check:fix`); don't add ESLint or Prettier.
- Add tests with changes: Vitest for components (`src/**/*.test.tsx`) and the API (`tests/api`),
  Playwright for user flows (`tests/e2e`).
- New app pages go in `APP_PAGES` (`backend/src/appPages.ts`) and `src/main.tsx`; that list decides what is a
  page and what is a short link, everywhere.
- Schema changes are new numbered files in `backend/migrations/`. Deploys are described in `deploy/README.md`.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:` …), checked by commitlint.
