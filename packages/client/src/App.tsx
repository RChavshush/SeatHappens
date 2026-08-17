import { useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { ScreeningView } from "./screening/ScreeningView";

export const App = () => {
  const { user, token, signOut } = useAuth();

  if (!token || !user) return <AuthScreen />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold">Cinema Reservation</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{user.displayName}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-slate-700 px-3 py-1 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-4">
        <ScreeningView />
      </main>
    </div>
  );
};
