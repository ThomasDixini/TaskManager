---
id: 103
title: Docker Compose (Postgres) + environment setup + README
status: backlog
wave: 1
depends_on: []
priority: medium
estimate: S
files:
  - docker-compose.yml
  - .env.example
  - README.md
prd_refs: [NFR-Environment, NFR-Configuration, Technical-Considerations]
agent_ready: true
---

# 103 – Docker Compose (Postgres) + environment setup + README

## Context (self-contained)

We are building a personal, local-only Kanban board app: Angular frontend + ASP.NET Core backend + PostgreSQL database. The chosen local dev workflow is: **only Postgres runs in Docker**; the API (`dotnet run`, from `server/`) and the Angular dev server (`ng serve`, from `client/`) both run directly on the host machine for fast hot-reload/debugging. This is a monorepo: `client/` (Angular, built in a parallel task), `server/` (ASP.NET Core, built in a parallel task), and this root-level Docker Compose file for Postgres.

This task sets up the Postgres container definition, the environment variable convention the backend will read its connection string from, and a top-level README explaining how to run the whole stack locally.

## Interfaces you must conform to

Pin these values exactly — a later task (201, EF Core setup) will connect to Postgres using them:

- Postgres container: image `postgres:16`, service name `postgres` in `docker-compose.yml`.
- Host port mapping: **`5433:5432`** (host port 5433 to avoid clashing with any Postgres already installed locally on the default 5432).
- Database name: `kanban`
- Username: `kanban`
- Password: `kanban_dev_password` (this is a local-only, non-sensitive default — not a real secret — safe to commit in `.env.example`)
- The connection string the ASP.NET Core API will read is an environment variable named **`ConnectionStrings__Default`** (ASP.NET Core's double-underscore convention for nested config keys), with value:
  `Host=localhost;Port=5433;Database=kanban;Username=kanban;Password=kanban_dev_password`

## What to do

1. Create `docker-compose.yml` at the repo root with a single `postgres` service:
   - image `postgres:16`
   - environment: `POSTGRES_DB=kanban`, `POSTGRES_USER=kanban`, `POSTGRES_PASSWORD=kanban_dev_password`
   - ports: `"5433:5432"`
   - a named volume for data persistence across restarts (e.g. `postgres_data:/var/lib/postgresql/data`)
2. Create `.env.example` at the repo root documenting the environment variables needed to run the stack:
   ```
   # Postgres (used by docker-compose.yml)
   POSTGRES_DB=kanban
   POSTGRES_USER=kanban
   POSTGRES_PASSWORD=kanban_dev_password

   # Read by the ASP.NET Core API (server/) to connect to Postgres
   ConnectionStrings__Default=Host=localhost;Port=5433;Database=kanban;Username=kanban;Password=kanban_dev_password
   ```
3. Write `README.md` at the repo root with setup/run instructions:
   - Prerequisites: Docker, .NET SDK, Node.js/npm, Angular CLI.
   - Steps: `docker compose up -d` (starts Postgres), then `cd server && dotnet run` (starts API on `http://localhost:5080`, auto-applies EF Core migrations on startup), then `cd client && npm install && ng serve` (starts frontend on `http://localhost:4200`).
   - Note that the API reads `ConnectionStrings__Default` from the environment (see `.env.example`); mention that on Windows/PowerShell or macOS/Linux shells, this can be set via the shell, a `.env` file loaded by your terminal, or directly in `server/appsettings.Development.json` for convenience during local dev.
   - Briefly describe the project layout: `client/` (Angular), `server/` (ASP.NET Core API), `docker-compose.yml` (Postgres only).

## Acceptance criteria

- [ ] `docker compose up -d` starts a Postgres 16 container named per the `postgres` service, reachable on `localhost:5433`, with database `kanban`, user `kanban`, password `kanban_dev_password`.
- [ ] Data persists across `docker compose down` + `docker compose up -d` (named volume configured).
- [ ] `.env.example` exists at the repo root and documents both the Postgres variables and `ConnectionStrings__Default`, with values matching exactly what's pinned above.
- [ ] `README.md` exists at the repo root with clear, ordered steps to run Postgres, the API, and the frontend locally.

## Out of scope

- Do not containerize the API or the Angular app — both run directly on the host per the chosen dev workflow.
- Do not create the `server/` or `client/` project files — those are owned by tasks 101 and 102 respectively.
- Do not add a production/deployment Compose configuration — out of scope for this local-only MVP.
