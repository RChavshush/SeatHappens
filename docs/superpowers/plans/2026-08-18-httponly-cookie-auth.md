# httpOnly Cookie Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the session JWT out of JavaScript's reach by delivering and reading it as an `httpOnly` cookie instead of a bearer token in the response body / `localStorage`.

**Architecture:** Server signs the same JWT but sets it as an `httpOnly`, `sameSite=lax` cookie and responds with `{ user }` only. The auth guard and socket handshake read the token from the cookie. The client sends `credentials: "include"`, never touches the token, and clears sessions via a new `POST /auth/logout`. Full cutover — no bearer-token path remains.

**Tech Stack:** TypeScript, Express, `cookie-parser`, socket.io, Prisma, Zod, Vitest + supertest (server); React 19, react-query, socket.io-client, Vitest (client).

**Spec:** `docs/superpowers/specs/2026-08-18-httponly-cookie-auth-design.md`

## Global Constraints

- **Types in `types.ts`.** Every `type`/`interface` goes in the nearest `types.ts`. Runtime values (constants, Zod schemas, functions) stay in their own files; derived types are re-exported from `types.ts`.
- **Arrow functions only.** `const f = () => {}`, never `function f() {}`. Applies to helpers and callbacks.
- **Comments only when the code cannot speak for itself.** No restating.
- **Cookie name is `token`** everywhere (server set, guard read, socket read, tests).
- **Cookie options:** `{ httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax", path: "/" }` — identical for set and clear.
- **Run a single server test file** with: `npm test --workspace @cinema/server -- <path>` from repo root. Full server suite needs a running Postgres reachable via `DATABASE_URL`; if it is unavailable, say so and stop rather than reporting a false pass.
- **Run client tests** with: `npm test --workspace @cinema/client -- <path>`.

### Test-conversion rule (used by Tasks 2–7)

The bearer-token contract is gone, so every integration test authenticates by
sending the session cookie captured at registration. `TestUser` (Task 1)
exposes `cookie: string` (the raw `token=<jwt>` name=value pair) instead of
`token: string`. The mechanical conversion in each test file is:

- Replace every `.auth(<user>.token, { type: "bearer" })`
  with `.set("Cookie", <user>.cookie)`.
- For socket clients, replace `auth: { token: <user>.token }`
  with `extraHeaders: { Cookie: <user>.cookie }`.

No other lines change. Each conversion task below lists that file's exact call
sites.

---

### Task 1: Server cutover — cookie in, token out

**Files:**
- Modify: `packages/shared/src/schemas.ts` (authResponseSchema)
- Modify: `packages/server/src/env.ts` (add `NODE_ENV`)
- Create: `packages/server/src/auth/cookie.ts`
- Modify: `packages/server/src/types.ts` (add `AuthResult`)
- Modify: `packages/server/src/auth/service.ts`
- Modify: `packages/server/src/auth/routes.ts` (set cookie, add logout)
- Modify: `packages/server/src/auth/guard.ts` (read cookie)
- Modify: `packages/server/src/http/app.ts` (cookie-parser, cors credentials)
- Modify: `packages/server/package.json` (add `cookie-parser`, `@types/cookie-parser`)
- Modify: `packages/server/src/testing/support.ts` (`TestUser.cookie`)
- Test: `packages/server/src/auth/auth.test.ts` (rewrite)

**Interfaces:**
- Produces:
  - `authResponseSchema` → `z.object({ user: userSchema })`; `AuthResponse = { user: User }`.
  - `AuthResult { token: string; user: User }` in server `types.ts`.
  - `service.login(input) / service.register(input): Promise<AuthResult>`.
  - `setAuthCookie(res: Response, token: string): void`, `clearAuthCookie(res: Response): void`, `AUTH_COOKIE_NAME = "token"` in `auth/cookie.ts`.
  - `TestUser { cookie: string; userId: string; email: string }`; `registerUser(app, label): Promise<TestUser>` still, cookie captured from `set-cookie`.
  - `POST /auth/logout` → 204, clears cookie.

- [ ] **Step 1: Add `cookie-parser` dependency**

Run from repo root:
```bash
npm install --workspace @cinema/server cookie-parser
npm install --workspace @cinema/server -D @types/cookie-parser
```

- [ ] **Step 2: Drop token from the shared auth response schema**

In `packages/shared/src/schemas.ts`, replace:
```ts
export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});
```
with:
```ts
export const authResponseSchema = z.object({
  user: userSchema,
});
```

- [ ] **Step 3: Add `NODE_ENV` to the server env schema**

In `packages/server/src/env.ts`, add this field to `envSchema` (before `SERVER_PORT`):
```ts
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
```

- [ ] **Step 4: Create the cookie helper**

Create `packages/server/src/auth/cookie.ts`:
```ts
import type { Response } from "express";
import { env } from "../env.js";

export const AUTH_COOKIE_NAME = "token";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
};
```

- [ ] **Step 5: Add the `AuthResult` type**

In `packages/server/src/types.ts`, add `User` to the shared import and add the interface:
```ts
import type { Hold, Reservation, SeatsUpdatedEvent, User } from "@cinema/shared";
```
```ts
export interface AuthResult {
  token: string;
  user: User;
}
```

- [ ] **Step 6: Return `AuthResult` from the service**

In `packages/server/src/auth/service.ts`, change the import of the return type and `toAuthResponse`:
```ts
import type { LoginRequest, RegisterRequest } from "@cinema/shared";
import type { AuthResult } from "../types.js";
```
```ts
const toAuthResult = (user: DbUser): AuthResult => ({
  token: signToken({ sub: user.id, email: user.email }),
  user: { id: user.id, email: user.email, displayName: user.displayName },
});
```
Update `register` and `login` return types to `Promise<AuthResult>` and their final `return toAuthResponse(user);` lines to `return toAuthResult(user);`. Remove the now-unused `AuthResponse` import.

- [ ] **Step 7: Set the cookie in the routes and add logout**

Replace the body of `packages/server/src/auth/routes.ts` with:
```ts
import { Router } from "express";
import { loginRequestSchema, registerRequestSchema } from "@cinema/shared";
import { asyncHandler } from "../http/async-handler.js";
import { validate } from "../http/middleware/validate.js";
import { clearAuthCookie, setAuthCookie } from "./cookie.js";
import { login, register } from "./service.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate(registerRequestSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await register(req.body);
    setAuthCookie(res, token);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  validate(loginRequestSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await login(req.body);
    setAuthCookie(res, token);
    res.json({ user });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});
```

- [ ] **Step 8: Read the token from the cookie in the guard**

Replace `packages/server/src/auth/guard.ts` with:
```ts
import type { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import { AUTH_COOKIE_NAME } from "./cookie.js";
import { verifyToken } from "./jwt.js";

export const authGuard = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token !== "string" || token.length === 0) {
    next(createError(401, "Missing authentication cookie", { code: "UNAUTHENTICATED" }));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(createError(401, "Invalid or expired token", { code: "UNAUTHENTICATED" }));
  }
};
```

- [ ] **Step 9: Wire cookie-parser and CORS credentials**

In `packages/server/src/http/app.ts`, add the import:
```ts
import cookieParser from "cookie-parser";
```
Change the cors line and add cookie-parser (cors and cookie-parser before the routes):
```ts
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
```

- [ ] **Step 10: Capture the cookie in the test helper**

In `packages/server/src/testing/support.ts`, change `TestUser` and `registerUser`:
```ts
export interface TestUser {
  cookie: string;
  userId: string;
  email: string;
}

export const registerUser = async (app: Express, label: string): Promise<TestUser> => {
  const email = `it-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@cinema.test`;
  const res = await request(app)
    .post("/auth/register")
    .send({ email, password: "password123", displayName: label });
  if (res.status !== 201) {
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers["set-cookie"];
  const cookie = Array.isArray(setCookie) ? setCookie[0]!.split(";")[0]! : "";
  return { cookie, userId: res.body.user.id, email };
};
```

- [ ] **Step 11: Rewrite the auth test (failing first)**

Replace `packages/server/src/auth/auth.test.ts` with:
```ts
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../db.js";
import { buildApp } from "../http/app.js";

const app = buildApp();
const email = `auth-test-${Date.now()}@cinema.test`;
const password = "password123";

const cookieFrom = (res: request.Response): string => {
  const setCookie = res.headers["set-cookie"];
  return Array.isArray(setCookie) ? setCookie[0]! : "";
};

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe("auth", () => {
  it("registers a user, sets an httpOnly cookie, and omits the token from the body", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email, password, displayName: "Auth Test" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, displayName: "Auth Test" });
    expect(res.body.token).toBeUndefined();
    expect(cookieFrom(res)).toMatch(/token=.+/);
    expect(cookieFrom(res).toLowerCase()).toContain("httponly");
  });

  it("rejects a duplicate email with 409", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email, password, displayName: "Dupe" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a malformed body with 422 VALIDATION_FAILED", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("logs in and sets a cookie", async () => {
    const res = await request(app).post("/auth/login").send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    expect(cookieFrom(res)).toMatch(/token=.+/);
  });

  it("rejects wrong password with 401", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email, password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("guards protected routes without a cookie", async () => {
    const res = await request(app).get("/screenings");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("allows a protected route with the session cookie", async () => {
    const agent = request.agent(app);
    await agent.post("/auth/login").send({ email, password });
    const res = await agent.get("/screenings");
    expect(res.status).toBe(200);
  });

  it("logout clears the cookie", async () => {
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(204);
    expect(cookieFrom(res).toLowerCase()).toMatch(/token=;|token=;\s|expires=/i);
  });
});
```

- [ ] **Step 12: Run the auth test, watch it fail then pass**

Run:
```bash
npm test --workspace @cinema/server -- src/auth/auth.test.ts
```
Before the source edits compile it fails; after Steps 2–10 it must pass. Expected: all 8 cases green, output clean.

- [ ] **Step 13: Commit**

```bash
git add packages/shared/src/schemas.ts packages/server/src/env.ts packages/server/src/auth packages/server/src/types.ts packages/server/src/http/app.ts packages/server/src/testing/support.ts packages/server/package.json package-lock.json
git commit -m "feat(server): authenticate via httpOnly cookie, add logout"
```

---

### Task 2: Convert `holds.test.ts`

**Files:**
- Test: `packages/server/src/domain/holds.test.ts`

**Interfaces:**
- Consumes: `TestUser.cookie` (Task 1).

- [ ] **Step 1: Apply the cookie conversion**

Per the Test-conversion rule, in `packages/server/src/domain/holds.test.ts` replace each `.auth(<user>.token, { type: "bearer" })` with `.set("Cookie", <user>.cookie)`. Call sites:
- `postHold`: `.auth(user.token, { type: "bearer" })` → `.set("Cookie", user.cookie)`
- `seatmap`: `.auth(user.token, { type: "bearer" })` → `.set("Cookie", user.cookie)`
- the three `request(app).delete(...).auth(userA.token, { type: "bearer" })` calls → `.set("Cookie", userA.cookie)`

- [ ] **Step 2: Run the test**

```bash
npm test --workspace @cinema/server -- src/domain/holds.test.ts
```
Expected: PASS, unchanged behavior.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domain/holds.test.ts
git commit -m "test(server): authenticate holds tests via cookie"
```

---

### Task 3: Convert `seatmap.test.ts`

**Files:**
- Test: `packages/server/src/domain/seatmap.test.ts`

**Interfaces:**
- Consumes: `TestUser.cookie` (Task 1).

- [ ] **Step 1: Apply the cookie conversion**

In `packages/server/src/domain/seatmap.test.ts`, replace the three `.auth(viewer.token, { type: "bearer" })` occurrences (lines ~23, ~32, ~44) with `.set("Cookie", viewer.cookie)`.

- [ ] **Step 2: Run the test**

```bash
npm test --workspace @cinema/server -- src/domain/seatmap.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domain/seatmap.test.ts
git commit -m "test(server): authenticate seatmap tests via cookie"
```

---

### Task 4: Convert `confirm-release.test.ts`

**Files:**
- Test: `packages/server/src/domain/confirm-release.test.ts`

**Interfaces:**
- Consumes: `TestUser.cookie` (Task 1).

- [ ] **Step 1: Apply the cookie conversion**

In `packages/server/src/domain/confirm-release.test.ts`, replace every `.auth(user.token, { type: "bearer" })` (in `postHold` and the standalone `request(app)...` calls at lines ~51, ~58, ~64, ~77, ~78, ~90, ~93, ~97, ~106, ~111, ~125, ~132) with `.set("Cookie", user.cookie)`.

- [ ] **Step 2: Run the test**

```bash
npm test --workspace @cinema/server -- src/domain/confirm-release.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/domain/confirm-release.test.ts
git commit -m "test(server): authenticate confirm/release tests via cookie"
```

---

### Task 5: Convert `expiry.test.ts`

**Files:**
- Test: `packages/server/src/jobs/expiry.test.ts`

**Interfaces:**
- Consumes: `TestUser.cookie` (Task 1).

- [ ] **Step 1: Apply the cookie conversion**

In `packages/server/src/jobs/expiry.test.ts`, replace the `.auth(user.token, { type: "bearer" })` at line ~35 with `.set("Cookie", user.cookie)`.

- [ ] **Step 2: Run the test**

```bash
npm test --workspace @cinema/server -- src/jobs/expiry.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/jobs/expiry.test.ts
git commit -m "test(server): authenticate expiry test via cookie"
```

---

### Task 6: Convert `concurrency.test.ts`

**Files:**
- Test: `packages/server/src/concurrency.test.ts`

**Interfaces:**
- Consumes: `TestUser.cookie` (Task 1).

- [ ] **Step 1: Apply the cookie conversion**

In `packages/server/src/concurrency.test.ts`, replace the `.auth(user.token, { type: "bearer" })` in `postHold` (line ~26) and `confirm` (line ~30) with `.set("Cookie", user.cookie)`.

- [ ] **Step 2: Run the test**

```bash
npm test --workspace @cinema/server -- src/concurrency.test.ts
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/concurrency.test.ts
git commit -m "test(server): authenticate concurrency test via cookie"
```

---

### Task 7: Socket reads the cookie

**Files:**
- Modify: `packages/server/src/realtime/io.ts`
- Test: `packages/server/src/realtime/realtime.test.ts`

**Interfaces:**
- Consumes: `AUTH_COOKIE_NAME` (Task 1), `TestUser.cookie` (Task 1).

- [ ] **Step 1: Read the token from the handshake cookie in `io.ts`**

In `packages/server/src/realtime/io.ts`, add the import:
```ts
import { AUTH_COOKIE_NAME } from "../auth/cookie.js";
```
Replace `extractToken` with a cookie reader:
```ts
const readCookie = (header: string | undefined, name: string): string | null => {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
};
```
And change the handshake line inside `io.use`:
```ts
    const token = readCookie(socket.handshake.headers.cookie, AUTH_COOKIE_NAME);
```

- [ ] **Step 2: Convert the realtime test to the cookie handshake**

In `packages/server/src/realtime/realtime.test.ts`:
- The connected-socket client: replace `auth: { token: user.token }` with `extraHeaders: { Cookie: user.cookie }`.
- The hold POST: replace `.auth(user.token, { type: "bearer" })` with `.set("Cookie", user.cookie)`.
- The "rejects a handshake without a token" case: rename the title to `"rejects a handshake without a cookie"` and leave it passing no `extraHeaders` (still expected to reject).

- [ ] **Step 3: Run the test**

```bash
npm test --workspace @cinema/server -- src/realtime/realtime.test.ts
```
Expected: PASS — reject without cookie, broadcast with cookie.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/realtime/io.ts packages/server/src/realtime/realtime.test.ts
git commit -m "feat(server): authenticate the socket handshake via cookie"
```

---

### Task 8: Client fetch sends credentials; add logout

**Files:**
- Modify: `packages/client/src/api/client.ts`
- Modify: `packages/client/src/api/auth.ts`
- Test: `packages/client/src/api/client.test.ts` (rewrite)

**Interfaces:**
- Produces: `logout(): Promise<void>` in `api/auth.ts`; `apiFetch` sends `credentials: "include"` and no `Authorization` header.

- [ ] **Step 1: Rewrite the client test (failing first)**

Replace `packages/client/src/api/client.test.ts` with:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client";
import { ApiError } from "./errors";
import { setUnauthorizedHandler } from "./authEvents";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => body,
  }) as Response;

describe("apiFetch", () => {
  let onUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const stubFetch = (response: Response) => {
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  };

  it("sends credentials and no Authorization header", async () => {
    const fetchMock = stubFetch(jsonResponse(200, { ok: true }));
    await apiFetch("/screenings");
    const [, options] = fetchMock.mock.calls[0]!;
    expect(options.credentials).toBe("include");
    expect(new Headers(options.headers).has("Authorization")).toBe(false);
  });

  it("notifies on a 401 for a protected request", async () => {
    stubFetch(jsonResponse(401, { code: "UNAUTHORIZED", message: "nope" }));
    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not notify on a 401 from an /auth/* route", async () => {
    stubFetch(jsonResponse(401, { code: "INVALID_CREDENTIALS", message: "bad" }));
    await expect(
      apiFetch("/auth/login", { method: "POST", body: "{}" }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not notify on non-401 failures", async () => {
    stubFetch(jsonResponse(404, { code: "NOT_FOUND", message: "gone" }));
    await expect(apiFetch("/screenings")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test --workspace @cinema/client -- src/api/client.test.ts
```
Expected: FAIL — `credentials` is undefined and `Authorization` still set.

- [ ] **Step 3: Update `apiFetch`**

Replace `packages/client/src/api/client.ts` with:
```ts
import { errorResponseSchema } from "@cinema/shared";
import { env } from "../env";
import { notifyUnauthorized } from "./authEvents";
import { ApiError } from "./errors";

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      notifyUnauthorized();
    }
    const parsed = errorResponseSchema.safeParse(await readJson(response));
    const code = parsed.success ? parsed.data.code : "UNKNOWN";
    const message = parsed.success ? parsed.data.message : response.statusText;
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};
```

- [ ] **Step 4: Add `logout` to the auth API**

In `packages/client/src/api/auth.ts`, append:
```ts
export const logout = async (): Promise<void> => {
  await apiFetch<void>("/auth/logout", { method: "POST" });
};
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test --workspace @cinema/client -- src/api/client.test.ts
```
Expected: PASS, output clean.

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/api/client.ts packages/client/src/api/auth.ts packages/client/src/api/client.test.ts
git commit -m "feat(client): send credentials, drop bearer token, add logout"
```

---

### Task 9: Client auth state drops the token

**Files:**
- Modify: `packages/client/src/auth/storage.ts`
- Modify: `packages/client/src/auth/types.ts`
- Modify: `packages/client/src/auth/AuthContext.tsx`
- Modify: `packages/client/src/App.tsx`

**Interfaces:**
- Consumes: `logout()` (Task 8).
- Produces: `AuthState { user: User | null }`; `useAuth()` returns `{ user, signIn, signOut }` (no `token`).

- [ ] **Step 1: Drop the token from storage**

Replace `packages/client/src/auth/storage.ts` with:
```ts
import { userSchema } from "@cinema/shared";
import type { AuthResponse } from "@cinema/shared";
import type { AuthState } from "./types";

const USER_KEY = "cinema.user";

export const loadAuth = (): AuthState => {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return { user: null };

  const parsed = userSchema.safeParse(safeJsonParse(rawUser));
  if (!parsed.success) return { user: null };

  return { user: parsed.data };
};

export const saveAuth = (auth: AuthResponse): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
};

export const clearAuth = (): void => {
  localStorage.removeItem(USER_KEY);
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
```

- [ ] **Step 2: Drop the token from the auth types**

Replace `packages/client/src/auth/types.ts` with:
```ts
import type { AuthResponse, User } from "@cinema/shared";

export interface AuthState {
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
}
```

- [ ] **Step 3: Update the context — user-only state, logout on sign out**

In `packages/client/src/auth/AuthContext.tsx`:
- Add the import: `import { logout } from "../api/auth";`
- Change `signIn` and `signOut`:
```ts
  const signIn = useCallback((auth: AuthResponse) => {
    saveAuth(auth);
    setState({ user: auth.user });
  }, []);

  const signOut = useCallback(() => {
    void logout().catch(() => {});
    clearAuth();
    setState({ user: null });
  }, []);
```

- [ ] **Step 4: Gate the app on `user` only**

In `packages/client/src/App.tsx`:
```ts
  const { user, signOut } = useAuth();

  if (!user) return <AuthScreen />;
```

- [ ] **Step 5: Run the client suite and typecheck**

```bash
npm test --workspace @cinema/client
npm run typecheck --workspace @cinema/client
```
Expected: tests PASS; typecheck clean (no remaining `token` references — Task 10 clears the socket ones, so a `token` error in `ScreeningView`/`useSeatUpdates` here is expected until Task 10; if so, proceed and re-run typecheck after Task 10).

- [ ] **Step 6: Commit**

```bash
git add packages/client/src/auth/storage.ts packages/client/src/auth/types.ts packages/client/src/auth/AuthContext.tsx packages/client/src/App.tsx
git commit -m "feat(client): drop token from auth state, gate on user"
```

---

### Task 10: Client socket authenticates via cookie

**Files:**
- Modify: `packages/client/src/socket/socket.ts`
- Modify: `packages/client/src/socket/useSeatUpdates.ts`
- Modify: `packages/client/src/screening/ScreeningView.tsx`

**Interfaces:**
- Consumes: `useAuth().user` (Task 9).
- Produces: `createSocket(): Socket`; `useSeatUpdates(screeningId: string | undefined, enabled: boolean): void`.

- [ ] **Step 1: Drop the token from the socket factory**

Replace `packages/client/src/socket/socket.ts` with:
```ts
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { env } from "../env";

export const createSocket = (): Socket =>
  io(env.socketUrl, {
    withCredentials: true,
    autoConnect: false,
    transports: ["websocket"],
  });
```

- [ ] **Step 2: Gate the hook on an `enabled` flag**

In `packages/client/src/socket/useSeatUpdates.ts`:
- Change the signature and guard:
```ts
export const useSeatUpdates = (
  screeningId: string | undefined,
  enabled: boolean,
): void => {
```
- Change the effect guard from `if (!screeningId || !token) return;` to `if (!screeningId || !enabled) return;`
- Change `const socket = createSocket(token);` to `const socket = createSocket();`
- Change the dependency array `[screeningId, token, queryClient]` to `[screeningId, enabled, queryClient]`

- [ ] **Step 3: Update the consumer**

In `packages/client/src/screening/ScreeningView.tsx`:
- Change `const { token } = useAuth();` to `const { user } = useAuth();`
- Change `enabled: Boolean(token && screeningId),` to `enabled: Boolean(user && screeningId),`
- Change `useSeatUpdates(screeningId, token);` to `useSeatUpdates(screeningId, Boolean(user));`

- [ ] **Step 4: Typecheck and run the client suite**

```bash
npm run typecheck --workspace @cinema/client
npm test --workspace @cinema/client
```
Expected: typecheck clean (no `token` references remain), tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/socket/socket.ts packages/client/src/socket/useSeatUpdates.ts packages/client/src/screening/ScreeningView.tsx
git commit -m "feat(client): authenticate the socket via cookie"
```

---

## Final verification

- [ ] Server suite green (requires Postgres): `npm test --workspace @cinema/server`
- [ ] Client suite green: `npm test --workspace @cinema/client`
- [ ] Typecheck both: `npm run typecheck`
- [ ] Grep proves the bearer path is gone:
  ```bash
  git grep -n "getToken\|Authorization\|type: \"bearer\"\|res.body.token\|auth: { token" -- packages ':!*.md'
  ```
  Expected: no matches.
