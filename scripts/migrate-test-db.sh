#!/usr/bin/env bash
# Migrate the test database. The docker-compose Postgres already provides the
# lumotrack_test database with PostGIS enabled, so this just applies migrations.
# Requires `pnpm db:up` first.
set -e

# Override DATABASE_URL so migrations hit the test DB on host port 5433.
# drizzle.config.ts loads .env via dotenv, which won't overwrite a var already
# set here, so this wins.
DATABASE_URL=postgres://postgres:postgres@localhost:5433/lumotrack_test npx drizzle-kit migrate
