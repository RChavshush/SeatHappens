import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginRequestSchema, registerRequestSchema } from "@cinema/shared";
import type { LoginRequest, RegisterRequest } from "@cinema/shared";
import { login, register } from "../api/auth";
import { ApiError } from "../api/errors";
import { fieldErrors } from "../lib/formErrors";
import type { AuthMode, FieldErrors } from "../types";
import { useAuth } from "./AuthContext";

export const AuthScreen = () => {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: (payload: LoginRequest | RegisterRequest) =>
      mode === "login"
        ? login(payload as LoginRequest)
        : register(payload as RegisterRequest),
    onSuccess: signIn,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed =
      mode === "login"
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
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm space-y-4 rounded-xl bg-slate-900 p-6 shadow-lg"
      >
        <h1 className="text-xl font-semibold text-slate-100">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>

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
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
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
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
        >
          {mutation.isPending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
          className="w-full text-sm text-slate-400 hover:text-slate-200"
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </form>
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
    <span className="text-sm text-slate-300">{label}</span>
    <input
      type={type}
      value={value}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={error ? true : undefined}
      className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 focus:border-blue-500 focus:outline-none"
    />
    {error && <span className="text-xs text-red-400">{error}</span>}
  </label>
);
