import type { AuthResponse, User } from "@cinema/shared";

export interface AuthState {
  user: User | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
}
