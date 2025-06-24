# URL Shortener App

This is a monorepo for a URL shortener application with:
- **Backend**: Node.js, Express, TypeScript, MongoDB, Passport.js (Google social auth)
- **Frontend**: React, TypeScript, shadcn/ui

## Features
- Social login (Google)
- Create, manage, and view statistics for shortened URLs
- Modern UI with shadcn/ui

## Getting Started

### Backend
1. `cd backend`
2. Create a `.env` file with your MongoDB URI, Google OAuth credentials, and session secret.
3. `npm run dev` (or `npx ts-node src/index.ts`)

### Frontend
1. `npm install` (in project root)
2. `npm run dev`

---

## To Do
- Implement backend routes and models
- Set up Passport.js Google strategy
- Build frontend pages and components
