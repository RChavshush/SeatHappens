# Cinema Reservation System — Design

**Date:** 2026-08-17
**Context:** Airwayz Full Stack Developer home assignment
**Status:** Approved, ready for implementation planning

## 1. Problem

Build a full-stack cinema seat reservation system. Authenticated users view a seating map, temporarily hold available seats, and confirm a reservation.

### Requirements from the assignment

- Users must log in to access the system.
- View the seating map; select one or more available seats; complete a reservation.
- Seat status is one of: Available, Reserved, Booked.
- Layout: 10 rows of 10 seats, plus 3 additional rows of 5 seats (115 seats total).
- A hold lasts 15 minutes; expired holds are released automatically.
- Two users must never reserve the same seat.
- **Rule 1** — all seats in one selection must be consecutive and in the same row.
- **Rule 2** — a selection must not leave a single empty seat trapped between occupied seats. Any gap between two occupied seats must be zero or at least two seats wide. A single empty seat at a row edge is allowed.
- Both rules validated server-side.

### Technical constraints

- Front end: React
- Back end: Node.js + TypeScript
- Database: PostgreSQL
- Infrastructure: Docker for local execution
- Deliverables: source code, README with setup instructions, ERD

## 2. Decisions

| Question | Decision | Rationale |
|---|---|---|
| Rule 2 and pre-existing gaps | Reject only violations the selection *creates* | An expiring hold can leave a trapped single gap that no user caused. Strict post-state validation would make that row permanently unsellable. |
| Live updates | WebSocket via Socket.IO | All writes go over REST, so SSE would suffice — but `EventSource` cannot set headers, forcing the JWT into a query string. Socket.IO carries it in the handshake and provides rooms and reconnect. |
| Data model scope | One auditorium, implicit. Model Movie and Screening; seed one screening | The assignment describes a single seating map, so an `auditoriums` table would be a one-row table joined everywhere for nothing. `Screening` stays: seat state must be scoped per screening, otherwise the seat map is global and the system is permanently dead once seats fill. |
| ORM | Prisma | Typed client, migrations, seeding, and `prisma-erd-generator` produces the ERD from the schema so it cannot go stale. Raw SQL available via `$queryRaw` for the locking paths. |
| Validation | Zod, in `shared` | Request and response schemas are declared once and the TypeScript types are derived from them with `z.infer`, so the client and server cannot drift. Also validates server environment variables at startup. |
| Auth | Registration + login, JWT | User chose to include registration. |
| Concurrent holds | At most one active hold per user per screening; unlimited confirmed reservations | Matches a real ticketing cart. Confirming a hold frees the user to open a new one. |
| Re-selecting while holding | Atomically replace the previous hold | A misclick costs nothing, and client state stays a single `currentHold`. |
| Styling | Tailwind CSS v4 | Zero runtime, no config file in v4, and seat states express naturally as conditional class strings over a `grid-cols-10` layout. The seat map is a bespoke grid that no component library would build anyway, so the ~4 form and button components are hand-rolled. |
| Tests | Rule unit tests + concurrency integration tests | Targets the two genuinely hard parts of the assignment. |

## 3. Architecture

npm workspaces monorepo:

```
cinema/
  docker-compose.yml
  packages/
    shared/    # TypeScript types + pure seat-rule validator
    server/    # Node + TypeScript, Express, Prisma, Socket.IO
    client/    # React + Vite + TypeScript, TanStack Query, Tailwind v4
  docs/erd.svg
  README.md
```

The seat-selection validator lives in `shared` and is imported by both the client and the server. The client uses it to disable illegal seats as the user selects, giving instant feedback; the server re-runs the identical code as the authoritative check inside the hold transaction. One implementation, no possibility of the two sides disagreeing.

### Component responsibilities

- **`shared`** — Pure functions, Zod schemas, and the types derived from them. No I/O, no framework imports. Exports `validateSelection`, seat and status types, and a Zod schema per API request and response body. Types are never hand-written alongside a schema; they are always `z.infer<typeof Schema>`.
- **`server/domain`** — Seat map assembly and hold lifecycle rules, expressed over repository interfaces.
- **`server/db`** — Prisma client, transaction helpers, the two locking transactions.
- **`server/http`** — Express routers, auth middleware, error-to-status mapping.
- **`server/realtime`** — Socket.IO server, screening rooms, seat-delta broadcasts.
- **`client`** — React components, TanStack Query hooks, socket subscription that patches the query cache.

## 4. Data model

```
users(id, email UNIQUE, password_hash, display_name, created_at)

movies(id, title, duration_minutes)

seats(id, row_label, row_index, seat_number, section)
  UNIQUE(row_label, seat_number)

screenings(id, movie_id FK, starts_at)
  UNIQUE(starts_at)

seat_holds(id, screening_id FK, user_id FK, status, created_at, expires_at)
  status ∈ { active, confirmed, cancelled, expired }

seat_hold_seats(hold_id FK, seat_id FK, screening_id, PK(hold_id, seat_id))

seat_locks(screening_id FK, seat_id FK, hold_id FK, expires_at, PK(screening_id, seat_id))

reservations(id, screening_id FK, user_id FK, hold_id FK, reference_code UNIQUE, confirmed_at)

reservation_seats(reservation_id FK, seat_id FK, screening_id, PK(reservation_id, seat_id))
```

`seat_locks` holds exactly the currently-locked seats — one row per seat that some live hold owns. Rows are inserted when a hold is created and deleted when it is confirmed, cancelled, or expired. `seat_hold_seats` stays immutable as the audit record of what each hold covered.

Seat layout: rows A–J with 10 seats each (`section = 'main'`), rows K–M with 5 seats each (`section = 'balcony'`). The project models a single auditorium, so `seats` is a flat 115-row table seeded once and treated as static reference data — never mutated at runtime. All mutable state lives in `seat_locks` and `reservation_seats`, keyed by screening.

Should a second auditorium ever be needed, the migration is additive: create `auditoriums`, add a nullable `auditorium_id` to `seats` and `screenings`, backfill, then tighten the two unique constraints to include it. Nothing in the hold or reservation logic changes, because those key on `screening_id`.

### Integrity constraints

`screening_id` is denormalized onto both join tables so the database itself enforces the core invariants:

```sql
-- A seat can be booked at most once per screening.
CREATE UNIQUE INDEX reservation_seat_unique
  ON reservation_seats (screening_id, seat_id);

-- A seat can be locked by at most one live hold per screening.
-- Enforced by the primary key of seat_locks: PK(screening_id, seat_id).

-- A user holds at most one active hold per screening.
CREATE UNIQUE INDEX one_active_hold_per_user
  ON seat_holds (user_id, screening_id)
  WHERE status = 'active';
```

Two notes on why the seat lock is a table rather than a partial index on `seat_hold_seats`:

- A partial index predicate cannot reference `now()`, so an index keyed on expiry is impossible. An index keyed on the parent hold's `status` is also impossible, since a partial predicate cannot reference a joined table's column. Mirroring the status onto the join table would work but duplicates state that then has to be kept in sync.
- With `seat_locks`, the invariant is the primary key itself, expiry sweeping is a plain `DELETE ... WHERE expires_at <= now()`, and "which seats are currently locked" is a single indexed read for the seat map.

The `one_active_hold_per_user` index keys on `status = 'active'` for the same `now()` reason, so an expired-but-unswept hold would still block its owner. Every write transaction sweeps before inserting (section 5), which resolves this inside the same transaction.

Nothing is hard-deleted. Expired and cancelled holds keep their rows for audit.

## 5. Concurrency

Correctness never depends on a background job. Every read filters on `expires_at > now()`, and every write transaction sweeps expired holds as its first statement. All timestamps come from the database clock via `now()` — the application clock is never used, since multiple API instances drift.

### Create hold

Runs at `SERIALIZABLE` isolation with up to 3 retries on serialization failure (`40001`).

1. `DELETE FROM seat_locks WHERE screening_id = $1 AND expires_at <= now()`, then `UPDATE seat_holds SET status = 'expired' WHERE screening_id = $1 AND status = 'active' AND expires_at <= now()`.
2. If the user still has an active hold on this screening, set it to `cancelled`, delete its `seat_locks` rows, and collect those seats for the broadcast.
3. Load occupancy for the affected row: booked seats from `reservation_seats`, locked seats from `seat_locks`.
4. Run `validateSelection` against the post-selection state.
5. Insert the hold, its `seat_hold_seats` rows, and its `seat_locks` rows. A primary-key violation on `seat_locks` means another transaction won the race → `409 SEAT_UNAVAILABLE`.
6. Commit, then broadcast the seat deltas (newly held seats, plus seats released from the replaced hold).

`SERIALIZABLE` is required rather than row locks alone because Rule 2 reads *neighbouring* seats whose hold rows may not exist yet — a phantom read. Row-level locks cannot cover rows that do not exist. The unique indexes catch direct seat collisions, but only serializable isolation prevents two concurrent holds on adjacent seats from jointly creating an illegal gap. Given the traffic profile of a single auditorium, serialization failures are rare and a bounded retry absorbs them.

### Confirm hold

1. Sweep expired locks and holds, as in step 1 above.
2. `SELECT ... FROM seat_holds WHERE id = $1 AND user_id = $2 FOR UPDATE`.
3. Require `status = 'active' AND expires_at > now()`, else `410 HOLD_EXPIRED`.
4. Insert `reservations` and `reservation_seats`. A unique violation means the seat was booked concurrently → `409 SEAT_UNAVAILABLE`, and the transaction rolls back whole.
5. Set the hold to `confirmed` and delete its `seat_locks` rows — the seat is now permanently booked, so the lock has no further purpose.
6. Commit, then broadcast.

Confirming is idempotent by state: a second request finds the hold already `confirmed` and returns the existing reservation rather than creating a duplicate.

### Expiry job

A 10-second interval sweeps expired holds and broadcasts the released seats. Its only purpose is updating idle clients — reads and writes are already correct without it. This separation is deliberate and stated in the README.

## 6. Seat selection rules

Signature in `shared`:

```ts
type SeatState = 'available' | 'held' | 'booked';

function validateSelection(
  row: SeatState[],
  selection: number[],
): { ok: true } | { ok: false; code: RuleErrorCode };
```

Pre-checks: reject an empty selection, out-of-range indices, duplicates, and any selected seat that is not `available`.

**Rule 1 — consecutive within a row.** The server groups the requested seat IDs by row; more than one row is an immediate rejection (`NOT_CONSECUTIVE`). Within the row, sorted indices must form a contiguous run. A single seat trivially passes.

**Rule 2 — no trapped single gap.** Build the post-selection state array, treating the selection as occupied. Find every maximal run of empty seats. A run is illegal when its length is exactly 1 *and* it is bounded by occupied seats on both sides — that is, it touches neither index `0` nor index `len - 1`. Compute the illegal runs for the pre-selection state and the post-selection state; reject only when the post-state contains an illegal run that was not already illegal in the pre-state.

"Occupied" means booked, held by an unexpired hold (including the user's own), or part of the current selection.

The three worked examples in the assignment PDF become test cases verbatim.

## 7. API

```
POST   /auth/register              { email, password, displayName } -> { token, user }
POST   /auth/login                 { email, password }              -> { token, user }
GET    /screenings                                                  -> Screening[]
GET    /screenings/:id/seatmap                                      -> SeatMap
POST   /screenings/:id/holds       { seatIds: string[] }            -> Hold
DELETE /holds/:id                                                   -> 204
POST   /holds/:id/confirm                                           -> Reservation
GET    /me/hold?screeningId=                                        -> Hold | null
GET    /me/reservations                                             -> Reservation[]
```

`SeatMap` returns rows in display order, each seat carrying `{ id, number, status, heldByMe, holdExpiresAt? }`.

Every route except `/auth/*` requires a `Bearer` JWT.

Request bodies, path params, and query params are parsed by a `validate(schema)` Express middleware that runs the matching Zod schema from `shared` and replaces the raw value with the parsed one, so handlers receive typed input and never re-check shapes. A Zod failure maps to `422 VALIDATION_FAILED` with the flattened issue list. The client reuses the same schemas for the login and register form validation, and parses responses in development to catch contract drift early. Server environment variables are parsed by a Zod schema at startup, so a misconfigured container fails immediately with a readable message instead of at first request.

Socket.IO: clients join room `screening:<id>` after an authenticated handshake and receive `seats:updated` events carrying seat deltas. On reconnect the client refetches the full seat map to resync.

Error codes, mapped to HTTP status by a single middleware:

| Code | Status | Meaning |
|---|---|---|
| `SEAT_UNAVAILABLE` | 409 | One or more seats were taken concurrently |
| `NOT_CONSECUTIVE` | 422 | Rule 1 violation |
| `ISOLATED_SEAT` | 422 | Rule 2 violation |
| `HOLD_EXPIRED` | 410 | Hold expired before confirmation |
| `HOLD_NOT_FOUND` | 404 | No such hold for this user |
| `VALIDATION_FAILED` | 422 | Request body failed its Zod schema |

## 8. Front end

Two screens: an auth screen (login and register) and the seat map.

Server state is managed by TanStack Query. The Socket.IO subscription patches the seat-map query cache on `seats:updated`; a reconnect invalidates it for a full refetch.

The seat map renders rows A–J as a 10x10 grid and rows K–M as a 5-wide balcony block below, with a status legend: Available, Held by another user, Held by you, Booked. As the user selects, the shared validator runs client-side and disables seats that would produce an invalid selection, with the reason as a tooltip. The server still validates independently.

Styling is Tailwind v4, imported through a single `@import "tailwindcss"` with the seat palette declared as theme variables in `@theme`. Each seat state maps to one variant of a small `seatClasses` lookup rather than to conditional logic scattered through JSX, so the five states stay legible in one place. Seat colour is never the only signal — each state also carries a distinct border treatment and an `aria-label`, so the map stays readable to colour-blind users and to a screen reader. The whole layout is a single responsive grid that scrolls horizontally on narrow screens rather than reflowing, since a cinema row must stay a row.

A hold panel shows the single active hold with a countdown derived from the server's `expiresAt` — the client never owns the clock. It offers Confirm and Release. On reload the hold is restored from `GET /me/hold`. When the countdown reaches zero the client invalidates the seat map and shows a notice.

Rejected requests surface the typed error code as a human-readable toast.

## 9. Infrastructure

`docker compose up` starts three services:

- `db` — `postgres:17-alpine` with a healthcheck
- `server` — waits for the healthy database, runs migrations and the seed, then starts
- `client` — Vite dev server (development) or a static build behind nginx (production compose profile)

`.env.example` is committed. The ERD is generated from the Prisma schema into `docs/erd.svg` as part of the migration script.

## 10. Testing

**Unit (Vitest), on `shared`:** table-driven tests for `validateSelection` covering the three PDF examples verbatim, single-seat selections, cross-row rejection, 5-seat balcony rows, the edge exemption at both ends of a row, and the pre-existing-gap case that must be allowed.

**Integration (Vitest against a real PostgreSQL):**

- 10 parallel hold requests for the same seat → exactly one success, nine `SEAT_UNAVAILABLE`
- A hold past its expiry releases its seats to the next requester
- Confirming an expired hold → `HOLD_EXPIRED`
- Creating a second hold replaces the first and releases its seats
- Two users confirming holds on overlapping seats → exactly one reservation

## 11. Out of scope

Payment, seat pricing, ticket types, cancellation of confirmed reservations, admin screens, multiple auditoriums, and a showtime picker.

The assignment describes a single seating map, so the system models one auditorium and the client always renders the seeded screening. `Screening` is nonetheless a real entity rather than a constant, because seat state has to be scoped to something — without it, the first full house would end the demo. Growing to multiple auditoriums is an additive migration (section 4); growing to a showtime picker is a screen, not a schema change.
