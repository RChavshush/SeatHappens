import type { AuthResponse, User } from "@cinema/shared";

export interface AuthState {
  user: User | null;
  token: string | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
}
