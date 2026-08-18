import { useAuth } from "./auth/AuthContext";
import { AuthScreen } from "./auth/AuthScreen";
import { ScreeningView } from "./screening/ScreeningView";

export const App = () => {
  const { user, signOut } = useAuth();

  if (!user) return <AuthScreen />;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-neutral-900 bg-black/50 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-xl">
            🎬
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-black uppercase tracking-tight text-white">
              The Corner Cinema
            </h1>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-marquee">
              Now booking · no bad seats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-neutral-400 sm:inline">Hey, {user.displayName}</span>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-neutral-800 px-3 py-1 transition hover:border-marquee hover:text-marquee focus:outline-none focus-visible:ring-2 focus-visible:ring-marquee"
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
