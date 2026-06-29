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

```sh
cp .env.test.example .env.test   # first time only
pnpm db:up                       # start the test Postgres (host port 5433)
pnpm test:db:setup               # migrate the lumotrack_test database
pnpm test                        # run the suite
```

After the first setup, the day-to-day loop is just `pnpm db:up` (if the container isn't running) then `pnpm test`. Re-run `pnpm test:db:setup` only after adding a new migration. See [`context/code-standards.md`](context/code-standards.md) → Tests for details.
