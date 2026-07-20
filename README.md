# Kanban Board (Local, AI-assisted)

A personal, local-only Kanban board app: Angular frontend + ASP.NET Core backend + PostgreSQL database.

## Project layout

- `client/` — Angular frontend (dev server via `ng serve`)
- `server/` — ASP.NET Core API (runs via `dotnet run`)
- `docker-compose.yml` — Postgres only; the API and frontend run directly on the host for fast hot-reload/debugging

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) (Docker Desktop, with `docker compose`)
- [.NET SDK](https://dotnet.microsoft.com/download) (version matching `server/`)
- [Node.js](https://nodejs.org/) and npm
- [Angular CLI](https://angular.dev/tools/cli) (`npm install -g @angular/cli`)

## Running the stack locally

Run these in order, each typically in its own terminal:

1. **Start Postgres** (from the repo root):

   ```bash
   docker compose up -d
   ```

   This starts a `postgres:16` container named `kanban-postgres`, exposing the database on `localhost:5433` (database `kanban`, user `kanban`, password `kanban_dev_password`). Data persists across restarts in a named Docker volume (`postgres_data`).

2. **Start the API** (from `server/`):

   ```bash
   cd server
   dotnet run
   ```

   The API starts on `http://localhost:5080` and automatically applies EF Core migrations on startup.

3. **Start the frontend** (from `client/`):

   ```bash
   cd client
   npm install
   ng serve
   ```

   The frontend starts on `http://localhost:4200`.

## Configuration

The API reads its database connection string from the environment variable `ConnectionStrings__Default` (ASP.NET Core's double-underscore convention for nested configuration keys). See [`.env.example`](./.env.example) for the expected variables and values.

You can provide this in whichever way fits your workflow:

- Set it directly in your shell (PowerShell: `$env:ConnectionStrings__Default = "..."`; bash/zsh: `export ConnectionStrings__Default="..."`)
- Use a `.env` file loaded by your terminal or process manager
- For local dev convenience, set it directly in `server/appsettings.Development.json`

## Stopping / resetting

- Stop Postgres: `docker compose down` (data is preserved in the named volume)
- Stop Postgres and wipe all data: `docker compose down -v`
