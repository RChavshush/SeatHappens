import type { AuthResponse, User } from "@cinema/shared";

export interface Auth {
  user: User | null;
  isLoading: boolean;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
}
