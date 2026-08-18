import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginRequestSchema, registerRequestSchema } from "@cinema/shared";
import type { LoginRequest, RegisterRequest } from "@cinema/shared";
import { login, register } from "../api/auth";
import { ApiError } from "../api/errors";
import { fieldErrors } from "../lib/formErrors";
import type { AuthMode, FieldErrors } from "../types";
import { useAuth } from "./useAuth";
import { AUTH_MODE } from "./modes";

export const AuthScreen = () => {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<AuthMode>(AUTH_MODE.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (payload: LoginRequest | RegisterRequest) =>
      mode === AUTH_MODE.login
        ? login(payload as LoginRequest)
        : register(payload as RegisterRequest),
    onSuccess: signIn,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed =
      mode === AUTH_MODE.login
        ? loginRequestSchema.safeParse({ email, password })
        : registerRequestSchema.safeParse({ email, password, displayName });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
    mutation.reset();
  };

  const serverError = mutation.error instanceof ApiError ? mutation.error.message : null;

  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-red/15 blur-3xl"
      />
      <div className="relative w-full max-w-sm space-y-5">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Seat<span className="text-red">Happens</span>
          </h1>
          <p className="mt-1.5 text-sm text-neutral-400">
            Seat happens. Pick yours.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-hairline bg-panel/80 p-6 shadow-xl shadow-black/40 backdrop-blur"
        >
          <h2 className="text-lg font-bold text-white">
            {mode === AUTH_MODE.login ? "Welcome back" : "Save yourself a seat"}
          </h2>

          <Field
            label="Email"
            type="email"
            value={email}
            error={errors.email}
            onChange={setEmail}
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            error={errors.password}
            onChange={setPassword}
            autoComplete={mode === AUTH_MODE.login ? "current-password" : "new-password"}
          />
          {mode === AUTH_MODE.register && (
            <Field
              label="Display name"
              type="text"
              value={displayName}
              error={errors.displayName}
              onChange={setDisplayName}
              autoComplete="name"
            />
          )}

          {serverError && (
            <p role="alert" className="text-sm text-red-soft">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-red px-4 py-2.5 font-bold text-white transition hover:bg-red-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-red-soft focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:opacity-60"
          >
            {mutation.isPending
              ? "Rolling the reel…"
              : mode === AUTH_MODE.login
                ? "Take my seat"
                : "Sign me up"}
          </button>

          <button
            type="button"
            onClick={() =>
              switchMode(mode === AUTH_MODE.login ? AUTH_MODE.register : AUTH_MODE.login)
            }
            className="w-full text-sm text-neutral-400 transition hover:text-white"
          >
            {mode === AUTH_MODE.login
              ? "New here? Create an account"
              : "Already have a seat? Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
};

interface FieldProps {
  label: string;
  type: string;
  value: string;
  error?: string;
  autoComplete?: string;
  onChange: (value: string) => void;
}

const Field = ({ label, type, value, error, autoComplete, onChange }: FieldProps) => (
  <label className="block space-y-1">
    <span className="text-sm text-neutral-300">{label}</span>
    <input
      type={type}
      value={value}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      className="w-full rounded-md border border-hairline bg-white/[0.03] px-3 py-2 text-neutral-100 focus:border-red focus:outline-none focus:ring-1 focus:ring-red/60"
    />
    {error && <span className="text-xs text-red-soft">{error}</span>}
  </label>
);
