# Cinema Reservation — Task Breakdown

**Spec:** [2026-08-17-cinema-reservation-design.md](../specs/2026-08-17-cinema-reservation-design.md)

This is the task split for parallel work. Not an implementation plan — no code here.

## Dependency shape

`shared` (Zod schemas + seat-rule validator) blocks everything. Once it is published, three tracks run independently.

```
Task 1  scaffold ──> Task 2  shared ──> everything below

              after shared lands, 3 parallel tracks:

  SERVER (A)   3 ──> 4 ──> 5 ──> 6 ──> 7 ──> 8
  CLIENT (B)   9 ──> 10 ──> 11
  INFRA  (C)   12          (may start right after Task 1)
```

- The bottleneck is Task 2. Build it first, fast, well-tested.
- Client does not wait for a running server — it codes against the Zod schemas, and wires to the live API only at the end of Track B.
- Task 8 is the integration point where server correctness is proven. Slowest, least parallel.
- Solo order: 1 → 2 → 6 (prove the concurrency path early) → the rest.

---

## Serial foundation

### Task 1 — Monorepo scaffold
- npm workspaces: `packages/shared`, `packages/server`, `packages/client`
- Root `tsconfig` base, shared lint/format config
- `.env.example` committed
- Empty package stubs so the three tracks can start

### Task 2 — `shared` package (keystone)
- Zod schemas for every API request and response body; types via `z.infer`
- Seat and seat-state types
- `validateSelection` — pure function, no I/O
- Unit tests: the three PDF examples verbatim, single seat, cross-row reject, 5-seat balcony rows, edge exemption both ends, pre-existing-gap allowed
- Publish/build so both other packages can import it

---

## Track A — Server (needs `shared`)

### Task 3 — Prisma schema, migrations, seed, ERD
- 9 tables: users, movies, screenings, seats, seat_holds, seat_hold_seats, seat_locks, reservations, reservation_seats
- Unique/partial indexes: `reservation_seats(screening_id, seat_id)`, `seat_locks` PK, `one_active_hold_per_user`
- Seed 115 seats (A–J ×10, K–M ×5), one movie, one screening
- Generate `docs/erd.svg` from the schema

### Task 4 — Auth
- `POST /auth/register`, `POST /auth/login`
- bcrypt hashing, JWT issue
- Bearer-JWT guard middleware on all non-auth routes
- Zod `validate(schema)` middleware; env parsed by Zod at startup

### Task 5 — Seat map read
- `GET /screenings` and `GET /screenings/:id/seatmap`
- Per-seat status: available / held / held-by-me / booked, with `holdExpiresAt`
- Reads filter on `expires_at > now()` (lazy expiry authoritative)

### Task 6 — Create hold (hard one)
- `POST /screenings/:id/holds`
- SERIALIZABLE transaction, retry ≤3 on 40001
- Sweep expired locks + holds first; cancel and replace user's own active hold
- Validate post-selection state with `validateSelection`
- Insert hold + `seat_hold_seats` + `seat_locks`; PK violation → `409 SEAT_UNAVAILABLE`

### Task 7 — Confirm + release
- `POST /holds/:id/confirm` — re-verify under `FOR UPDATE`, insert reservation, delete locks, idempotent by state
- `DELETE /holds/:id` — early release
- `GET /me/hold`, `GET /me/reservations`

### Task 8 — Realtime, expiry job, integration tests
- Socket.IO: authenticated handshake, room per screening, `seats:updated` deltas
- 10s expiry sweeper (UX only, broadcasts released seats)
- Integration tests against real Postgres: 10 parallel holds → 1 wins; expiry releases; confirm-after-expiry → 410; replace-own-hold; two confirms on overlap → 1 reservation

---

## Track B — Client (needs `shared`, not a running server)

### Task 9 — Client scaffold + auth
- Vite + React + TS, Tailwind v4 (`@import`, `@theme` palette)
- TanStack Query client, socket.io-client setup
- Auth screen: login + register, forms validated by shared Zod schemas
- Token storage, authed fetch wrapper

### Task 10 — Seat map UI
- 10×10 main grid + 3×5 balcony block, status legend
- Live client-side validation via shared `validateSelection`; illegal seats disabled with reason tooltip
- Colour never the only signal: border treatment + `aria-label` per state
- Horizontal scroll on narrow screens (rows never reflow)

### Task 11 — Hold panel + realtime
- Single active hold, countdown derived from server `expiresAt` (client never owns the clock)
- Confirm + Release buttons
- Socket subscription patches query cache; reconnect → full refetch
- Restore hold on reload from `GET /me/hold`; expiry → invalidate + notice
- Typed error codes surfaced as toasts

---

## Track C — Infra (needs only Task 1)

### Task 12 — Docker + README
- `docker compose up`: `db` (postgres:17-alpine + healthcheck), `server` (waits healthy, migrate + seed, start), `client`
- `.env.example` wired through compose
- README: setup, run, architecture notes, concurrency trade-off (SERIALIZABLE + retry), ERD link
