To install dependencies:
```sh
pnpm install
```

To run:
```sh
bun run dev
```

open http://localhost:3000

## Testing

Tests use `bun test` against a real Postgres+PostGIS database running in Docker (separate from your dev DB).

First time only, create `.env.test` (same vars as `.env`, with `DATABASE_URL=postgres://postgres:postgres@localhost:5433/lumotrack_test`). Then:

```sh
pnpm db:up          # start the test Postgres (host port 5433)
pnpm test:migrate   # migrate the lumotrack_test database
pnpm test           # run the suite
```

After the first setup, the day-to-day loop is just `pnpm db:up` (if the container isn't running) then `pnpm test`. Re-run `pnpm test:migrate` only after adding a new migration. See [`context/code-standards.md`](context/code-standards.md) → Tests for details.
