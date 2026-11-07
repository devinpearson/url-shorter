# Club Links: one image with the API, short-link redirects and the built web app.
# On the server it runs beside its own PostgreSQL in deploy/compose.yml, behind the host's nginx.

# ---- Build the web app and the backend ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Git hooks aren't needed in the image.
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm run build:backend

# ---- Production: runtime dependencies and the built files only ----
FROM node:22-bookworm-slim AS production
WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# backend/package.json marks the compiled backend as CommonJS (the root package is ESM).
COPY backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
COPY backend/migrations ./backend/migrations
COPY --from=build /app/dist ./dist

ENV PORT=8090
# The backend serves the built web app from here (createApp's staticDir).
ENV STATIC_DIR=/app/dist
EXPOSE 8090

# Nothing is written to disk, so run as the image's unprivileged user.
USER node

# Applies pending migrations, then serves.
CMD ["node", "backend/dist/index.js"]
