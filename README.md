<div align="center">
  <img src="docs/logo.svg" width="76" alt="SeatHappens logo" />
  <h1>SeatHappens</h1>
  <p><em>Seat happens. Pick yours.</em></p>
</div>

A full-stack cinema seat-reservation app. Sign in, browse screenings, hold seats
for 15 minutes, and book them, with a hard guarantee that two people can never
grab the same seat.

**Stack:** React + Vite + TypeScript · Node + Express + Prisma · PostgreSQL ·
Redis · Socket.IO · Docker Compose

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- App: <http://localhost:5173> · API: <http://localhost:4000>
- Demo logins (password `password123`): `ada@cinema.test`, `grace@cinema.test`, `alan@cinema.test`

Compose brings up **db**, **redis**, **server** (runs migrations and seeds
automatically), and **client**. Tear it all down with `docker compose down -v`.

<details>
<summary>Run without Docker</summary>

Needs Node ≥ 20 and a reachable PostgreSQL and Redis.

```bash
npm ci
npm run build -w @cinema/shared
npm run prisma:generate -w @cinema/server
npm run prisma:migrate -w @cinema/server
npm run db:seed -w @cinema/server
npm run dev:server   # one shell
npm run dev:client   # another
```
</details>

## How it works

- **No double-booking.** Creating a hold runs in a `SERIALIZABLE` transaction
  with a bounded retry, backed by a DB unique index as the last line of defense.
  Only serializable isolation stops two concurrent holds from jointly creating an
  illegal single-seat gap (a phantom read plain row-locks cannot cover).
- **Holds expire on their own.** Expiry is lazy and DB-authoritative (every read
  filters on `expires_at > now()`). Redis key-expiry notifications push instant
  releases to other viewers, but correctness never depends on them.
- **One rule, one source.** The seat-selection rules (consecutive within a row;
  no isolated single seat) live in a pure `shared` validator imported by both the
  client (instant feedback) and the server (authoritative check).
- **Live and secure.** Seat changes broadcast over Socket.IO; auth is a JWT in an
  httpOnly cookie.

## Layout

```
packages/shared   Zod schemas + the pure seat-rule validator
packages/server   Express, Prisma, Socket.IO, Redis
packages/client   React, TanStack Query, Tailwind v4
docs/erd.md       ERD, generated from the Prisma schema
```

## ERD

Generated from the Prisma schema, so it can never go stale:
**[docs/erd.md](docs/erd.md)**.
