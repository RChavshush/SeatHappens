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
    <main className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div aria-hidden="true" className="text-4xl">
            🎬🍿
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight text-white">
            The Corner Cinema
          </h1>
          <p className="mt-1 text-sm text-marquee">
            Grab your seat before someone else grabs the popcorn.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 shadow-xl shadow-black/40 backdrop-blur"
        >
          <h2 className="text-lg font-bold text-white">
            {mode === AUTH_MODE.login ? "Welcome back" : "Join the club"}
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
          <p role="alert" className="text-sm text-red-400">
            {serverError}
          </p>
        )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-xl bg-marquee px-4 py-2.5 font-bold uppercase tracking-wide text-black transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-marquee focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60"
          >
            {mutation.isPending
              ? "Rolling the reel…"
              : mode === AUTH_MODE.login
                ? "Take my seat"
                : "Sign me up"}
          </button>

          <button
            type="button"
            onClick={() => switchMode(mode === AUTH_MODE.login ? AUTH_MODE.register : AUTH_MODE.login)}
            className="w-full text-sm text-neutral-400 transition hover:text-marquee"
          >
            {mode === AUTH_MODE.login
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
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
      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-marquee focus:outline-none focus:ring-1 focus:ring-marquee/60"
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </label>
);
