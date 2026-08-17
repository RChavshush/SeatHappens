# Cinema Reservation System

A full-stack cinema seat reservation system. Authenticated users view a seating
map, temporarily hold available seats, and confirm a reservation. Seat holds
last 15 minutes and are released automatically; two users can never reserve the
same seat.

- **Front end:** React + Vite + TypeScript, TanStack Query, Tailwind CSS v4
- **Back end:** Node.js + TypeScript, Express, Prisma, Socket.IO
- **Database:** PostgreSQL 17
- **Infrastructure:** Docker Compose

The design rationale is in
[docs/superpowers/specs/2026-08-17-cinema-reservation-design.md](docs/superpowers/specs/2026-08-17-cinema-reservation-design.md).

## Repository layout

This is an npm workspaces monorepo:

```
cinema/
  docker-compose.yml
  packages/
    shared/    # Zod schemas, derived types, and the pure seat-rule validator
    server/    # Node + TypeScript, Express, Prisma, Socket.IO
    client/    # React + Vite + TypeScript
  docs/erd.md  # Entity-relationship diagram, generated from the Prisma schema
```

The seat-selection validator lives in `shared` and is imported by both the
client (for instant feedback) and the server (as the authoritative check), so
the two sides cannot disagree.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) with Compose v2
  (`docker compose`, not the legacy `docker-compose`)

Running outside Docker additionally needs Node.js >= 20 and a local PostgreSQL
instance.

## Setup

Copy the example environment file and adjust it if needed. The defaults work
out of the box for local Docker use.

```bash
cp .env.example .env
```

Key variables:

| Variable | Purpose |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `DATABASE_URL` | Prisma connection string (host is the `db` service) |
| `SERVER_PORT` | API port (default `4000`) |
| `JWT_SECRET` | Signing secret — **change this outside local dev** |
| `HOLD_DURATION_MINUTES` | Seat-hold lifetime (default `15`) |
| `VITE_API_URL` / `VITE_SOCKET_URL` | Where the client reaches the API |

## Run

```bash
docker compose up --build
```

This starts three services:

1. **`db`** — `postgres:17-alpine` with a `pg_isready` healthcheck. Data
   persists in the `db-data` volume.
2. **`server`** — waits for the database to report healthy, then runs
   `prisma migrate deploy`, seeds the 115 seats plus one movie and screening,
   and starts the API.
3. **`client`** — the Vite dev server on port `5173`.

Once the stack is up:

- Client: <http://localhost:5173>
- API: <http://localhost:4000>

Seeded demo accounts (all with password `password123`):
`ada@cinema.test`, `grace@cinema.test`, `alan@cinema.test`.

Stop the stack with `Ctrl+C`, or remove it (including the database volume) with:

```bash
docker compose down -v
```

### Running without Docker

```bash
npm ci
npm run build -w @cinema/shared
npm run prisma:generate -w @cinema/server
npm run prisma:migrate -w @cinema/server
npm run db:seed -w @cinema/server
npm run dev:server
npm run dev:client
```

This needs a reachable PostgreSQL instance and a `DATABASE_URL` pointing at it.

## Seat selection rules

Both rules are validated server-side (the client runs the same shared validator
for instant feedback, but the server is authoritative):

- **Rule 1 — consecutive:** the seats chosen within a row must be adjacent.
- **Rule 2 — no isolated seat:** a selection must not leave a single empty seat
  trapped between occupied seats. Only violations the selection *creates* are
  rejected; a gap that already existed (e.g. left behind by an expired hold) is
  not held against the user.

### Extension: multi-row selection

The assignment's Rule 1 restricts a selection to a single row. This project
extends it so a **single hold can span multiple rows** — a group can reserve a
block in each of several rows in one action and sit together (for example the
back rows), instead of making one reservation per row.

The rules still hold **per row**: each row's chosen seats must be consecutive
(Rule 1) and must not create an isolated seat (Rule 2), evaluated independently
for every row in the selection. The shared validator exposes `validateSelection`
(one row) and `validateRows` (many rows); the create-hold transaction groups the
requested seats by row and validates each. This is a deliberate enhancement
beyond the brief, not a relaxation of the safety rules.

## Concurrency trade-off

Two users must never reserve the same seat, and a selection must never create an
illegal single-seat gap (spec Rule 2). Rule 2 reads the *neighbouring* seats of
a selection, whose hold rows may not exist yet — a phantom read that row-level
locks cannot cover, because a lock cannot be taken on a row that does not exist.

The create-hold transaction therefore runs at **`SERIALIZABLE`** isolation with
a **bounded retry (up to 3 attempts on serialization failure `40001`)**. Unique
indexes catch direct seat collisions, but only serializable isolation prevents
two concurrent holds on adjacent seats from jointly creating an illegal gap.

The trade-off: serializable isolation aborts transactions that conflict, so the
application must retry them. For a single auditorium the traffic is low and such
conflicts are rare, so a small bounded retry absorbs them without a measurable
cost — in exchange for correctness that no weaker isolation level provides.

Expiry is **lazy and authoritative**: every read filters on `expires_at > now()`
and every write transaction sweeps expired holds as its first statement, using
the database clock (`now()`), never the application clock. A separate 10-second
background sweeper exists **only** to push released seats to idle clients over
Socket.IO — correctness never depends on it.

## Entity-relationship diagram

The ERD is generated from the Prisma schema (so it cannot go stale) into
[docs/erd.md](docs/erd.md).
