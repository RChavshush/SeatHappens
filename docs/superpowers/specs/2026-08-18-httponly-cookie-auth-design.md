# httpOnly Cookie Auth — Design

**Date:** 2026-08-18
**Status:** Proposed
**Scope:** Full cutover from a JS-readable bearer token to an httpOnly session cookie.

## Problem

The JWT is currently returned in the auth response body and stored in
`localStorage` on the client. Any script running in the page — including one
injected via XSS — can read `localStorage.getItem("cinema.token")` and
exfiltrate a fully valid credential, usable until the token expires. Every
alternative JS-accessible location (sessionStorage, React context, the
react-query cache, a module variable) has the identical exposure: if JavaScript
can read it, XSS can steal it.

The only storage that removes the token from JavaScript's reach is an
`httpOnly` cookie. The browser attaches it to requests automatically and
`document.cookie` cannot read it, so an injected script cannot exfiltrate it.

## Goals

- The session token is never readable by client JavaScript.
- Authenticated HTTP requests and the realtime socket both authenticate via the
  cookie.
- No bearer-token code path remains (full cutover, not dual-accept).

## Non-goals

- No new auth features (OAuth, password reset, email verification, refresh
  tokens). If those arrive, revisit adopting a dedicated auth library instead.
- No change to token contents, signing, expiry, or the `JWT_SECRET` model.
- No change to password hashing.

## Approach

Keep the existing hand-rolled JWT + bcrypt. Change only *where the token
travels and lives*:

- Server signs the same JWT, but delivers it as a `Set-Cookie` header with
  `httpOnly`, `secure` (production only), and `sameSite: "lax"`, instead of in
  the response body.
- The auth guard and the socket handshake read the token from the cookie.
- The client stops handling the token entirely: no `getToken`, no
  `Authorization` header, no token in `localStorage`. It sends
  `credentials: "include"` and lets the browser carry the cookie.
- A new `POST /auth/logout` clears the cookie, since the client can no longer
  clear an httpOnly cookie itself.

### Why `sameSite: "lax"`

Dev runs the Vite client and the API on different ports of `localhost`, and
production is expected to be same-site (same registrable domain, e.g. app and
`api.` subdomain). Both are same-site, so `lax` allows the cookie on
cross-origin requests initiated from the app while blocking cross-site CSRF
carriers. `credentials: true` in CORS with an explicit `origin` (never `*`) is
required for the browser to send and accept the cookie.

**Load-bearing assumption:** the realtime socket uses the websocket transport,
and the browser only attaches the cookie to the websocket upgrade handshake for
same-site connections. If the socket is ever hosted on a genuinely cross-site
domain, this design breaks and the socket needs a separate auth mechanism.

## Data flow

### Sign in / register
1. Client POSTs credentials to `/auth/login` or `/auth/register` with
   `credentials: "include"`.
2. Server verifies (bcrypt) or creates the user, signs the JWT.
3. Server responds `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; [Secure]`
   and a body of `{ user }`.
4. Client stores `user` in `localStorage` (for the render gate only) and in
   auth context. The token is never seen by client JS.

### Authenticated request
1. Browser attaches the cookie automatically (`credentials: "include"`).
2. `authGuard` reads `req.cookies.token`, verifies it, sets `req.user`.
3. On failure, 401 → the existing client 401 handler signs out.

### Realtime socket
1. Client opens the socket with `withCredentials: true` and no token argument.
2. Browser attaches the cookie to the websocket upgrade handshake.
3. Server reads the token from `socket.handshake.headers.cookie`, verifies it.

### Sign out
1. Client calls `POST /auth/logout`.
2. Server clears the cookie.
3. Client clears `user` from context and `localStorage`.

## Components changed

**Shared**
- `authResponseSchema`: drop `token`; becomes `{ user }`.

**Server**
- `service.ts`: `login`/`register` return the signed token to the route
  (internally) so the route can set the cookie; the HTTP body carries only
  `user`.
- `routes.ts`: set the cookie on login/register; add `POST /auth/logout`.
- `guard.ts`: read the token from `req.cookies.token`.
- `io.ts`: `extractToken` reads the cookie from the handshake headers.
- `app.ts`: add `cookie-parser`; set `cors({ origin, credentials: true })`.
- New dependency: `cookie-parser` and `@types/cookie-parser`.

**Server tests**
- `testing/support.ts`: `registerUser` returns a `supertest` agent that holds
  the session cookie, instead of a bearer token string.
- The integration test files (`auth`, `concurrency`, `realtime`,
  `confirm-release`, `expiry`, `seatmap`, `holds`) authenticate through the
  agent instead of `.set("Authorization", ...)`.

**Client**
- `api/client.ts`: add `credentials: "include"`; remove `getToken` and the
  `Authorization` header.
- `storage.ts`, `AuthContext.tsx`, `auth/types.ts`, `App.tsx`: drop `token`;
  the auth state is `{ user }`; the render gate keys on `user` alone; `user`
  still persists in `localStorage`.
- `api/auth.ts`: `login`/`register` return `{ user }`; add `logout()`.
- `AuthContext.signOut`: call `POST /auth/logout`, then clear state.
- `socket/socket.ts`: drop the `token` parameter; add `withCredentials: true`.
- `socket/useSeatUpdates.ts` and `screening/ScreeningView.tsx`: drop the
  `token` argument; gate on `user`.
- `api/client.test.ts`: rewrite without the `getToken` mock.

## Error handling

- Missing or invalid cookie on a protected route → 401 `UNAUTHENTICATED`
  (unchanged behavior, new source).
- Missing or invalid cookie on the socket handshake → connection rejected
  (unchanged behavior, new source).
- `/auth/logout` is idempotent: clearing an already-absent cookie is a no-op
  success.

## Testing

- TDD throughout. Server integration tests move to the cookie-agent helper and
  must stay green — they are the proof the cutover preserves behavior.
- New tests:
  - login/register set an `httpOnly` cookie and omit the token from the body;
  - a protected route succeeds with the cookie and 401s without it;
  - `/auth/logout` clears the cookie;
  - the socket authenticates from the handshake cookie.
- Client `api/client.test.ts` rewritten to assert `credentials: "include"` and
  the absence of any `Authorization` header; the existing 401-sign-out tests
  are preserved.

## Rollout

Server and client ship together — the response-body contract changes, so a
partial deploy breaks auth. Existing sessions holding a `localStorage` token
are invalidated by the deploy and must sign in again (acceptable; the token was
the vulnerability being removed).
