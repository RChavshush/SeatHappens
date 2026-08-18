// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";
import { login } from "../api/auth";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const jsonResponse = (status: number, body: unknown): Response =>
  ({ ok: status >= 200 && status < 300, status, statusText: "", json: async () => body }) as Response;

const user = { id: "u1", email: "ada@cinema.test", displayName: "Ada" };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const AuthScreen = () => {
  const { signIn } = useAuth();
  const mutation = useMutation({
    mutationFn: () => login({ email: user.email, password: "password123" }),
    onSuccess: signIn,
  });
  return <button type="button" onClick={() => mutation.mutate()}>login</button>;
};

const App = () => {
  const { user: current, isLoading } = useAuth();
  if (isLoading) return <div>loading</div>;
  if (!current) return <AuthScreen />;
  return <div>APP {current.displayName}</div>;
};

describe("logged-out /me does not refetch-loop", () => {
  it("settles on the auth screen and advances after login", async () => {
    let meCalls = 0;
    let loginBody: unknown = { user };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const path = String(input);
        if (path.endsWith("/me")) {
          meCalls += 1;
          return jsonResponse(401, { code: "UNAUTHENTICATED", message: "no" });
        }
        if (path.endsWith("/auth/login")) return jsonResponse(200, loginBody);
        throw new Error(`unexpected ${path}`);
      }),
    );

    const container = document.createElement("div");
    const queryClient = new QueryClient();
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </StrictMode>,
      );
    });

    const tick = async () => {
      for (let i = 0; i < 6; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
    };
    await tick();

    expect(container.textContent).toContain("login");
    const callsAfterSettle = meCalls;
    await tick();
    // No runaway refetching once settled on the auth screen.
    expect(meCalls - callsAfterSettle).toBeLessThanOrEqual(1);

    await act(async () => {
      container.querySelector("button")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await tick();
    expect(container.textContent).toContain("APP");

    await act(async () => root.unmount());
  }, 15000);
});
