import { useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { ScreeningView } from "./screening/ScreeningView";

export const App = () => {
  const { user, token, signOut } = useAuth();

  if (!token || !user) return <AuthScreen />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">
            🎬
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-bold tracking-tight text-slate-100">The Corner Cinema</h1>
            <p className="text-[0.65rem] uppercase tracking-widest text-marquee">
              Now booking · no bad seats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-400 sm:inline">Hey, {user.displayName}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-slate-700 px-3 py-1 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-marquee"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <ScreeningView />
      </main>
    </div>
  );
};
